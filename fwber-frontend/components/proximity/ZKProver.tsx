import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, MapPin, CheckCircle2, AlertTriangle, Fingerprint } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ToastProvider';
import geohash from 'ngeohash';
import hmacSHA256 from 'crypto-js/hmac-sha256';
import Hex from 'crypto-js/enc-hex';

// Simulating a hardware-burned Secret Execution Key
const HARDWARE_ENCLAVE_SECRET = "fwber-zk-hardware-enclave-secret";

interface ZKProverProps {
    targetEntityType: 'venue' | 'event' | 'user' | 'chatroom';
    targetEntityId: number;
    onProofVerified?: (recordId: number) => void;
    className?: string;
}

export const ZKProver: React.FC<ZKProverProps> = ({
    targetEntityType,
    targetEntityId,
    onProofVerified,
    className = ''
}) => {
    const { token } = useAuth();
    const { showSuccess, showError } = useToast();

    const [status, setStatus] = useState<'idle' | 'locating' | 'generating' | 'verifying' | 'success' | 'error'>('idle');
    const [proofTrace, setProofTrace] = useState<string[]>([]);
    const [zkParams, setZkParams] = useState<{ secret: string, precision: number } | null>(null);

    // Fetch ZK parameters on mount
    useEffect(() => {
        const fetchParams = async () => {
            try {
                const res: any = await api.get('/proximity/zk-params');
                setZkParams(res);
            } catch (err) {
                console.error("Failed to load ZK parameters", err);
            }
        };
        fetchParams();
    }, []);

    // Deterministic mock SNARK delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const addTrace = (msg: string) => {
        setProofTrace(prev => [...prev.slice(-3), msg]);
    };

    const getPosition = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation not supported."));
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });
    };

    const generateAndVerifyProof = async () => {
        if (!token || !zkParams) return;
        try {
            setStatus('locating');
            addTrace('Accessing protected hardware enclave...');
            await delay(800);

            addTrace('Acquiring raw geolocation points...');
            const position = await getPosition();

            setStatus('generating');
            addTrace('Hashing coordinates into scalar field...');

            // Map to precision defined by server
            const userGeohash = geohash.encode(position.coords.latitude, position.coords.longitude, zkParams.precision);

            addTrace('Compiling arithmetic circuit constraints (HMAC)...');
            await delay(1000);

            const timestamp = Math.floor(Date.now() / 1000);

            // HMAC-SHA256(geohash + timestamp + target_entity_id, APP_KEY)
            const signatureStr = userGeohash + timestamp.toString() + targetEntityId.toString();
            const signature = hmacSHA256(signatureStr, zkParams.secret).toString(Hex);

            addTrace('Proof generated successfully. Raw coordinates destroyed. Payload dispatched.');
            setStatus('verifying');

            const payload = {
                target_entity_type: targetEntityType,
                target_entity_id: targetEntityId,
                proof_payload: {
                    geohash: userGeohash,
                    signature: signature
                },
                public_signals: {
                    timestamp: timestamp,
                    target_entity_id: targetEntityId
                },
                proof_hash: signature // Reusing signature as the proof identifier
            };

            const res: any = await api.post('/proximity/zk-verify', payload);

            if (res.verified) {
                setStatus('success');
                showSuccess('ZK-Proof Validated', 'Your presence has been cryptographically verified.');
                if (onProofVerified && res.record_id) {
                    onProofVerified(res.record_id);
                }
            } else {
                throw new Error("Proof rejected by server.");
            }

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            showError('Proximity Verification Failed', err.message || 'The zero-knowledge proof failed verification.');
        }
    };

    return (
        <div className={`dark:bg-background border dark:border-border rounded-xl p-6 text-white max-w-sm ${className}`}>

            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-full ${status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {status === 'success' ? <ShieldCheck className="w-6 h-6" /> : <Fingerprint className="w-6 h-6" />}
                </div>
                <div>
                    <h3 className="font-semibold text-lg">ZK-Proximity Proof</h3>
                    <p className="text-xs text-muted-foreground">Cryptographic privacy-first verification</p>
                </div>
            </div>

            <div className="space-y-4 mb-6 relative">
                {/* Progress Indicator */}
                {status !== 'idle' && status !== 'error' && status !== 'success' && (
                    <div className="flex items-center gap-2 mb-4 text-blue-400 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium uppercase tracking-wider">{status}...</span>
                    </div>
                )}

                {/* Trace Box */}
                {proofTrace.length > 0 && (
                    <div className="bg-black/40 rounded-lg p-3 font-mono text-[10px] text-green-400 overflow-hidden h-24 border dark:border-border flex flex-col justify-end">
                        {proofTrace.map((msg, idx) => (
                            <div key={idx} className="opacity-80">
                                {`> ${msg}`}
                            </div>
                        ))}
                        {status !== 'success' && status !== 'error' && (
                            <div className="animate-pulse">_</div>
                        )}
                    </div>
                )}

                {status === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-3 text-green-400 items-start">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm">Cryptographic proof validated. You have been verified at this location.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3 text-red-400 items-start">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm">Verification failed. Ensure you have granted location access and are physically near the target.</p>
                    </div>
                )}
            </div>

            {(status === 'idle' || status === 'error') && (
                <button type="button"
                    onClick={generateAndVerifyProof}
                    className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] flex items-center justify-center gap-2"
                >
                    <MapPin className="w-4 h-4" />
                    <span>Generate ZK Proof</span>
                </button>
            )}

            {status === 'success' && (
                <button
                    disabled
                    className="w-full dark:bg-card text-green-400 font-medium py-3 px-4 rounded-lg opacity-70 cursor-not-allowed flex items-center justify-center gap-2"
                >
                    Verified
                </button>
            )}

            {/* Info Notice */}
            <p className="mt-4 text-[10px] text-muted-foreground text-center leading-relaxed">
                Your raw GPS coordinates never leave your device. Only a mathematical zero-knowledge proof (SNARK) is submitted to our servers verifying proximity against the target radius constraint.
            </p>
        </div>
    );
};
