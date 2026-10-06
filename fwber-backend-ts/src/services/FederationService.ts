import prisma from '../lib/prisma.js';
import { SentimentAnalysisService } from './SentimentAnalysisService.js';
import axios from 'axios';
import crypto from 'crypto';
import { validateFederationUrl, getHardenedFederationAgent } from '../lib/ssrf.js';
import { AutonomousService } from './AutonomousService.js';
import { ActivityNotificationService } from './ActivityNotificationService.js';

export class FederationService {
  /**
   * Resolves a remote WebFinger handle (e.g. @user@domain.com) to an ActivityPub actor URI.
   */
  async resolveWebFinger(handle: string): Promise<string | null> {
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
    const [username, domain] = cleanHandle.split('@');

    if (!username || !domain) {
      console.error(`[Federation] Invalid handle for WebFinger: ${handle}`);
      return null;
    }

    const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`;
    console.log(`[Federation] Resolving WebFinger: ${webfingerUrl}`);

    try {
      const agent = await getHardenedFederationAgent(webfingerUrl);
      const res = await axios.get(webfingerUrl, {
        headers: { Accept: 'application/jrd+json, application/json' },
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 5000
      });

      const links = res.data.links || [];
      const selfLink = links.find((l: any) => l.rel === 'self' && (l.type === 'application/activity+json' || l.type === 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'));

      if (selfLink && selfLink.href) {
        console.log(`[Federation] Resolved ${handle} to ${selfLink.href}`);
        this.trackPeer(domain).catch(() => {});
        return selfLink.href;
      }

      console.warn(`[Federation] No ActivityPub self-link found for ${handle}`);
      return null;
    } catch (err: any) {
      console.error(`[Federation] WebFinger resolution failed for ${handle}:`, err.message);
      return null;
    }
  }

  /**
   * Verifies the HTTP Signature on an incoming ActivityPub request.
   */
  async verifyHttpSignature(req: any): Promise<boolean> {
    const signatureHeader = req.headers.signature;
    if (!signatureHeader) return false;

    try {
      const parts = signatureHeader.split(',').reduce((acc: any, part: string) => {
        const [key, value] = part.split('=');
        if (key && value) {
          acc[key.trim()] = value.replace(/"/g, '').trim();
        }
        return acc;
      }, {});

      if (!parts.keyId || !parts.signature || !parts.headers) return false;

      // 1. Fetch remote actor public key
      const agent = await getHardenedFederationAgent(parts.keyId);
      const remoteActor = await axios.get(parts.keyId, {
        headers: { Accept: 'application/activity+json' },
        httpsAgent: agent,
        httpAgent: agent
      });
      const publicKeyPem = remoteActor.data.publicKey.publicKeyPem;

      // 2. Reconstruct signature string
      const headersToSign = parts.headers.split(' ');
      const signedString = headersToSign.map((header: string) => {
        if (header === '(request-target)') {
          return `(request-target): ${req.method.toLowerCase()} ${req.originalUrl}`;
        }
        return `${header}: ${req.headers[header]}`;
      }).join('\n');

      // 3. Verify
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(signedString);
      const isVerified = verifier.verify(publicKeyPem, parts.signature, 'base64');

      if (isVerified) {
        console.log(`[Federation] Successfully verified HTTP Signature for keyId: ${parts.keyId}`);
        return true;
      } else {
        console.log(`[Federation] Invalid HTTP Signature for keyId: ${parts.keyId}`);
        return false;
      }
    } catch (e) {
      console.error('[Federation] Signature verification failed:', e);
      return false;
    }
  }

  /**
   * Handle incoming ActivityPub messages
   */
  async processInboxActivity(activity: any, targetUserId: bigint) {
    console.log(`[Federation] Processing ${activity.type} for user ${targetUserId}`);

    switch (activity.type) {
      case 'Follow':
        await this.handleFollow(activity, targetUserId);
        break;
      case 'Undo':
        if (activity.object) {
          if (activity.object.type === 'Follow') await this.handleUndoFollow(activity, targetUserId);
          else if (activity.object.type === 'Like' || activity.object.type === 'Announce') await this.handleUndoInteraction(activity, targetUserId);
        }
        break;
      case 'Accept':
        await this.handleAccept(activity, targetUserId);
        break;
      case 'Create':
        await this.handleCreate(activity, targetUserId);
        break;
      case 'Update':
        await this.handleUpdate(activity, targetUserId);
        break;
      case 'Delete':
        await this.handleDelete(activity, targetUserId);
        break;
      case 'Like':
        await this.handleLike(activity, targetUserId);
        break;
      case 'Announce':
        await this.handleAnnounce(activity, targetUserId);
        break;
      default:
        console.log(`[Federation] Unhandled activity type: ${activity.type}`);
    }
  }

  /**
   * Processes incoming Create activities (remote posts).
   * Note: In a production environment, this would often be filtered by following status.
   */
  private async handleCreate(activity: any, targetUserId: bigint) {
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const object = activity.object;

    if (!object || !object.id) {
        console.warn(`[Federation] Received malformed Create activity from ${actorUri}`);
        return;
    }

    console.log(`[Federation] Received Create activity from ${actorUri} for user ${targetUserId}`);

    // Note: Persistent storage of the activity itself happens in the route handler.
    // This service method is for logic-level processing (e.g. notifications on mentions).
    if (object.type === 'Note') {
        const content = object.content || '';

        // Dynamic Emotional Identity: analyze remote post to influence neighborhood sentiment locally
        try {
            await SentimentAnalysisService.analyzeUserSentiment(targetUserId);
        } catch (e) {
            console.error('[Federation] Could not analyze sentiment for incoming activity', e);
        }
        const user = await prisma.users.findUnique({ where: { id: targetUserId } });
        const mentionTag = `@${user?.name}`;

        if (content.includes(mentionTag)) {
            try {
                const agent = await getHardenedFederationAgent(actorUri);
                const actorRes = await axios.get(actorUri, {
                    headers: { Accept: 'application/activity+json' },
                    httpsAgent: agent,
                    httpAgent: agent,
                    timeout: 5000
                });
                const actorName = actorRes.data.preferredUsername || 'Someone';
                const actorDomain = new URL(actorUri).hostname;

                await ActivityNotificationService.notifyMention(targetUserId, actorName, actorDomain, content as string);
            } catch (err) {
                await ActivityNotificationService.notifyMention(targetUserId, 'Someone', 'remote', content as string);
            }
        }

        // Handle Reply to local artifact
        if (object.inReplyTo) {
            const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
            const artifactPrefix = `https://${apiDomain}/api/proximity/artifacts/`;
            if (object.inReplyTo.startsWith(artifactPrefix)) {
                const artifactId = object.inReplyTo.split('/').pop() || '';
                if (!artifactId) return;

                try {
                    // 1. Resolve remote user
                    let remoteUser = await prisma.users.findUnique({ where: { actor_uri: actorUri } });
                    if (!remoteUser) {
                        const agent = await getHardenedFederationAgent(actorUri);
                        const actorRes = await axios.get(actorUri, {
                            headers: { Accept: 'application/activity+json' },
                            httpsAgent: agent,
                            httpAgent: agent,
                            timeout: 5000
                        });
                        const actorHash = crypto.createHash('md5').update(actorUri).digest('hex').substring(0, 8);
                        remoteUser = await prisma.users.create({
                            data: {
                                name: actorRes.data.preferredUsername || 'remote_user',
                                email: `remote-${actorHash}@federated`,
                                password: 'REMOTE_ACCOUNT_NO_LOGIN',
                                actor_uri: actorUri,
                                is_remote: true
                            }
                        });
                    }

                    // 2. Store comment
                    await prisma.proximity_artifact_comments.create({
                        data: {
                            proximity_artifact_id: BigInt(artifactId),
                            user_id: remoteUser.id,
                            content: content
                        }
                    });

                    // 3. Notify artifact owner
                    const artifact = await prisma.proximity_artifacts.findUnique({ where: { id: BigInt(artifactId) } });
                    if (artifact && artifact.user_id) {
                        const actorDomain = new URL(actorUri).hostname;
                        await ActivityNotificationService.notifyReply(artifact.user_id, remoteUser.name, actorDomain, content);
                    }
                } catch (err: any) {
                    console.error('[Federation] Failed to process inbound reply:', err.message);
                }
            }
        }
    }
  }

  private async handleLike(activity: any, targetUserId: bigint) {
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const objectUri = typeof activity.object === 'string' ? activity.object : activity.object.id;

    console.log(`[Federation] ${actorUri} liked ${objectUri} for user ${targetUserId}`);

    if (objectUri.includes('api.fwber.site')) {
        const outboxItem = await prisma.federation_outbox.findUnique({
            where: { activity_id: objectUri }
        });

        if (outboxItem) {
            try {
              const agent = await getHardenedFederationAgent(actorUri);
              const actorRes = await axios.get(actorUri, {
                headers: { Accept: 'application/activity+json' },
                httpsAgent: agent,
                httpAgent: agent
              });
              const actorName = actorRes.data.preferredUsername || 'Someone';
              const actorDomain = new URL(actorUri).hostname;
              const meta = outboxItem.payload as any;
              const objectTitle = meta?.object?.content || 'your post';

              await ActivityNotificationService.notifyLike(targetUserId, actorName, actorDomain, objectTitle);
            } catch (err) {
              await ActivityNotificationService.notifyLike(targetUserId, 'Someone', 'remote', 'your post');
            }
        }
    }
  }

  private async handleAnnounce(activity: any, targetUserId: bigint) {
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const objectUri = typeof activity.object === 'string' ? activity.object : activity.object.id;

    console.log(`[Federation] ${actorUri} announced (boosted) ${objectUri} for user ${targetUserId}`);

    if (objectUri.includes('api.fwber.site')) {
        const outboxItem = await prisma.federation_outbox.findUnique({
            where: { activity_id: objectUri }
        });

        if (outboxItem) {
            try {
              const agent = await getHardenedFederationAgent(actorUri);
              const actorRes = await axios.get(actorUri, {
                headers: { Accept: 'application/activity+json' },
                httpsAgent: agent,
                httpAgent: agent
              });
              const actorName = actorRes.data.preferredUsername || 'Someone';
              const actorDomain = new URL(actorUri).hostname;
              const meta = outboxItem.payload as any;
              const objectTitle = meta?.object?.content || 'your post';

              await ActivityNotificationService.notifyBoost(targetUserId, actorName, actorDomain, objectTitle);
            } catch (err) {
              await ActivityNotificationService.notifyBoost(targetUserId, 'Someone', 'remote', 'your post');
            }
        }
    }
  }

  private async handleFollow(activity: any, targetUserId: bigint) {
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
    const targetUri = `https://${apiDomain}/api/federation/actors/${targetUserId}`;

    console.log(`[Federation] ${actorUri} wants to follow local user ${targetUserId}`);

    try {
        const user = await prisma.users.findUnique({
            where: { id: targetUserId },
            select: { private_key: true }
        });

        let remoteUser = await prisma.users.findUnique({
            where: { actor_uri: actorUri }
        });

        if (!remoteUser) {
            try {
                const agent = await getHardenedFederationAgent(actorUri);
                const actorRes = await axios.get(actorUri, {
                    headers: { Accept: 'application/activity+json' },
                    httpsAgent: agent,
                    httpAgent: agent
                });
                const actorHash = crypto.createHash('md5').update(actorUri).digest('hex').substring(0, 8);
                remoteUser = await prisma.users.create({
                    data: {
                        name: actorRes.data.preferredUsername || 'remote_user',
                        email: `remote-${actorHash}@federated`,
                        password: 'REMOTE_ACCOUNT_NO_LOGIN',
                        actor_uri: actorUri,
                        is_remote: true,
                        public_key: actorRes.data.publicKey?.publicKeyPem || null
                    }
                });
            } catch (err) {
                const actorHash = crypto.createHash('md5').update(actorUri).digest('hex').substring(0, 8);
                remoteUser = await prisma.users.create({
                    data: {
                        name: 'remote_user',
                        email: `remote-${actorHash}@federated`,
                        password: 'REMOTE_ACCOUNT_NO_LOGIN',
                        actor_uri: actorUri,
                        is_remote: true
                    }
                });
            }
        }

      await prisma.federation_follows.create({
        data: {
          actor_uri: actorUri,
          target_uri: targetUri,
          status: 'accepted'
        }
      });

      const actorDomain = new URL(actorUri).hostname;
      await ActivityNotificationService.notifyFollow(targetUserId, remoteUser.name, actorDomain);

      if (user?.private_key) {
          const acceptActivity = {
              '@context': 'https://www.w3.org/ns/activitystreams',
              id: `https://${apiDomain}/api/federation/activities/accept-${Date.now()}`,
              type: 'Accept',
              actor: targetUri,
              object: activity
          };

          try {
              const agent = await getHardenedFederationAgent(actorUri);
              const actorRes = await axios.get(actorUri, {
                headers: { Accept: 'application/activity+json' },
                httpsAgent: agent,
                httpAgent: agent
              });
              const inbox = actorRes.data.inbox;
              if (inbox) {
                  const inboxAgent = await getHardenedFederationAgent(inbox);
                  await this.sendSignedRequest(inbox, acceptActivity, user.private_key, targetUri, inboxAgent);
              }
          } catch (err: any) {}
      }
    } catch (e) {
      console.error('[Federation] Error recording follow:', e);
    }
  }

  private async handleUndoFollow(activity: any, targetUserId: bigint) {
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
    const targetUri = `https://${apiDomain}/api/federation/actors/${targetUserId}`;
    try {
        await prisma.federation_follows.deleteMany({
            where: { actor_uri: actorUri, target_uri: targetUri }
        });
    } catch (err) {}
  }

  /**
   * Processes incoming Update activities (remote profile changes).
   */
  private async handleUpdate(activity: any, targetUserId: bigint) {
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const object = activity.object;

    if (!object || object.type !== 'Person') return;

    try {
        await prisma.users.updateMany({
            where: { actor_uri: actorUri },
            data: {
                name: object.preferredUsername || object.name || undefined,
                public_key: object.publicKey?.publicKeyPem || undefined
            }
        });
        console.log(`[Federation] Updated cached details for remote actor: ${actorUri}`);
    } catch (err: any) {
        console.error('[Federation] Failed to update remote actor details:', err.message);
    }
  }

  /**
   * Processes incoming Delete activities.
   */
  private async handleDelete(activity: any, targetUserId: bigint) {
    const objectUri = typeof activity.object === 'string' ? activity.object : activity.object.id;
    if (!objectUri) return;

    try {
        await prisma.federation_inbox.deleteMany({
            where: {
                OR: [
                    { activity_id: objectUri },
                    { payload: { path: ['object', 'id'], equals: objectUri } }
                ]
            }
        });
        console.log(`[Federation] Deleted remote activity/object from inbox: ${objectUri}`);
    } catch (err: any) {
        console.error('[Federation] Failed to process inbound delete:', err.message);
    }
  }

  /**
   * Handles Undo for interactions (Like/Announce).
   */
  private async handleUndoInteraction(activity: any, targetUserId: bigint) {
    const object = activity.object;
    const activityId = typeof object === 'string' ? object : object.id;
    if (!activityId) return;

    try {
        await prisma.federation_inbox.deleteMany({
            where: { activity_id: activityId }
        });
        console.log(`[Federation] Processed Undo for activity: ${activityId}`);
    } catch (err: any) {}
  }

  private async handleAccept(activity: any, targetUserId: bigint) {
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
    const targetUri = `https://${apiDomain}/api/federation/actors/${targetUserId}`;
    try {
        await prisma.federation_follows.updateMany({
            where: { actor_uri: targetUri, target_uri: actorUri },
            data: { status: 'accepted' }
        });
    } catch (err) {}
  }

  async broadcastUpdate(userId: bigint, objectPayload: any, activityType: string = 'Create') {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { private_key: true, name: true }
    });

    if (!user || !user.private_key) return;

    const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
    const actorUri = `https://${apiDomain}/api/federation/actors/${userId}`;
    const followers = await prisma.federation_follows.findMany({
        where: { target_uri: actorUri, status: 'accepted' }
    });

    if (followers.length === 0) return;

    const activity = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: `https://${apiDomain}/api/federation/activities/${activityType.toLowerCase()}-${Date.now()}`,
        type: activityType,
        actor: actorUri,
        object: objectPayload
    };

    const taskLabel = `ActivityPub ${activityType} Broadcast (User ${userId})`;
    await AutonomousService.logAction(taskLabel, 'Started', { follower_count: followers.length, object_type: objectPayload.type });

    let successCount = 0;
    for (const follower of followers) {
        try {
            const agent = await getHardenedFederationAgent(follower.actor_uri);
            const actorRes = await axios.get(follower.actor_uri, {
                headers: { Accept: 'application/activity+json' },
                httpsAgent: agent,
                httpAgent: agent
            });
            const inbox = actorRes.data.inbox;

            if (inbox) {
                const inboxAgent = await getHardenedFederationAgent(inbox);
                await this.sendSignedRequest(inbox, activity, user.private_key, actorUri, inboxAgent);
                successCount++;
            }
        } catch (err: any) {}
    }

    await AutonomousService.logAction(taskLabel, 'Completed', {
        success_count: successCount,
        total_count: followers.length
    });

    // Persist to local outbox
    try {
        await prisma.federation_outbox.create({
            data: {
                activity_id: activity.id,
                actor_uri: actorUri,
                type: activityType,
                payload: activity as any,
                delivered_at: new Date(),
                created_at: new Date()
            }
        });
    } catch (err: any) {
        console.error('[Federation] Failed to persist activity to outbox:', err.message);
    }
  }

  private async sendSignedRequest(inboxUrl: string, activity: any, privateKey: string, actorUri: string, agent: any) {
    const url = new URL(inboxUrl);
    const date = new Date().toUTCString();
    const digest = crypto.createHash('sha256').update(JSON.stringify(activity)).digest('base64');

    const stringToSign = `(request-target): post ${url.pathname}\nhost: ${url.host}\ndate: ${date}\ndigest: SHA-256=${digest}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(stringToSign);
    const signature = signer.sign(privateKey, 'base64');

    const signatureHeader = `keyId="${actorUri}#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`;

    await axios.post(inboxUrl, activity, {
        headers: {
            'Host': url.host,
            'Date': date,
            'Digest': `SHA-256=${digest}`,
            'Signature': signatureHeader,
            'Content-Type': 'application/activity+json',
            'Accept': 'application/activity+json'
        },
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 5000
    });
  }

  /**
   * Sends an activity directly to a remote actor's inbox.
   */
  async sendActivityToActor(actorUri: string, activity: any, privateKey: string, localActorUri: string) {
    try {
        const domain = new URL(actorUri).hostname;
        this.trackPeer(domain).catch(() => {});

        const agent = await getHardenedFederationAgent(actorUri);
        const actorRes = await axios.get(actorUri, {
            headers: { Accept: 'application/activity+json' },
            httpsAgent: agent,
            httpAgent: agent,
            timeout: 5000
        });
        const inbox = actorRes.data.inbox;
        if (inbox) {
            const inboxAgent = await getHardenedFederationAgent(inbox);
            await this.sendSignedRequest(inbox, activity, privateKey, localActorUri, inboxAgent);

            // Persist interaction to outbox
            await prisma.federation_outbox.create({
                data: {
                    activity_id: activity.id,
                    actor_uri: localActorUri,
                    type: activity.type,
                    payload: activity as any,
                    delivered_at: new Date(),
                    created_at: new Date()
                }
            }).catch(() => {});

            return true;
        }
    } catch (err: any) {
        console.error(`[Federation] Failed to send activity to ${actorUri}:`, err.message);
    }
    return false;
  }

  /**
   * Tracks a newly discovered or interacted-with federation peer.
   */
  async trackPeer(domain: string) {
    if (['localhost', '127.0.0.1'].includes(domain) || domain.startsWith('10.') || domain.startsWith('192.168.')) return;

    try {
        await prisma.federated_servers.upsert({
            where: { domain },
            update: { updated_at: new Date() },
            create: {
                domain,
                software: 'unknown',
                discovered_at: new Date()
            }
        });
    } catch (err: any) {
        // Silent fail for peer tracking
    }
  }

  /**
   * Broadcasts a profile update to all followers.
   */
  async broadcastProfileUpdate(userId: bigint, profileData: any) {
    const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
    const actorUri = `https://${apiDomain}/api/federation/actors/${userId}`;

    const updateActivity = {
        id: actorUri,
        type: 'Person',
        preferredUsername: profileData.preferredUsername,
        name: profileData.display_name,
        summary: profileData.bio,
        icon: profileData.avatar_url ? {
            type: 'Image',
            mediaType: 'image/jpeg',
            url: profileData.avatar_url
        } : null
    };

    await this.broadcastUpdate(userId, updateActivity, 'Update');
  }
}
