"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Coins, Heart, CheckCircle, Search } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { useAuth } from "@/lib/auth-context";
// Removed Radix UI avatar since it might not be installed directly, using simple divs instead
// import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"; 
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface Bounty {
  slug: string;
  token_reward: number;
  status: string;
  user: {
    id: number;
    name: string;
    avatar_url: string;
    profile: {
      display_name: string;
      age: number;
      bio: string;
      gender: string;
    } | null;
    photos: {
      id: number;
      url: string;
      is_primary: boolean;
    }[];
  };
}

interface Friend {
  id: number;
  name: string;
  username: string;
  avatar_url: string;
}

export default function BountyPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Suggestion State
  const [showSuggestUI, setShowSuggestUI] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    // Check if we came back from login and should show suggest UI
    if (currentUser && searchParams.get('action') === 'suggest') {
        setShowSuggestUI(true);
    }
  }, [currentUser, searchParams]);

  useEffect(() => {
    const fetchBounty = async () => {
      try {
        const response = await apiClient.get<{ bounty: Bounty }>(`/matchmaker/bounty/${slug}`);
        setBounty(response.data.bounty);
      } catch (err: any) {
        setError(err.message || "Failed to load bounty");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBounty();
    }
  }, [slug]);

  useEffect(() => {
    if (currentUser && showSuggestUI) {
      fetchFriends();
    }
  }, [currentUser, showSuggestUI]);

  const fetchFriends = async () => {
    try {
      // Assuming we have a friends endpoint or similar. 
      // If strict friends aren't implemented, we might search all users? 
      // For now, let's assume /friends endpoint exists as per routes file check previously.
      const response = await apiClient.get<Friend[]>('/friends'); 
      setFriends(Array.isArray(response.data) ? response.data : (response.data as any)?.data || []);
    } catch (error) {
      console.error("Failed to fetch friends", error);
    }
  };

  const handleSuggest = async () => {
    if (!selectedFriend) return;
    
    setSuggesting(true);
    try {
      await apiClient.post(`/bounties/${slug}/suggest`, {
        candidate_id: selectedFriend.id
      });
      
      toast({
        title: "Suggestion Sent!",
        description: `You have successfully suggested ${selectedFriend.name}.`,
        duration: 5000,
      });

      // Reset state or redirect
      setShowSuggestUI(false);
      setSelectedFriend(null);
      
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to suggest candidate.",
        variant: "destructive",
      });
    } finally {
      setSuggesting(false);
    }
  };

  const handleStartSuggestion = () => {
      if (!currentUser) {
          const returnUrl = encodeURIComponent(`/bounty/${slug}?action=suggest`);
          router.push(`/auth/login?return_url=${returnUrl}`);
      } else {
          setShowSuggestUI(true);
      }
  };

  if (loading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black dark:bg-background text-white transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-black dark:bg-background text-white p-4 transition-colors duration-300">
        <h1 className="text-2xl font-bold mb-4 text-red-500">
          {error || "Bounty not found"}
        </h1>
        <Button onClick={() => router.push("/")} variant="outline" className="dark:border-border dark:hover:dark:bg-card">
          Go Home
        </Button>
      </div>
    );
  }

  const primaryPhoto =
    bounty.user.photos.find((p) => p.is_primary) || bounty.user.photos[0];

  const filteredFriends = friends.filter(friend => 
     friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black dark:bg-background text-white flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
            Matchmaker Bounty
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Help find a match and earn tokens!
          </p>
        </div>

        <Card className="dark:bg-background dark:dark:bg-background/80 dark:border-border dark:dark:border-border/50 shadow-xl overflow-hidden backdrop-blur-sm">
          {/* Header Image */}
          <div className="relative h-64 w-full dark:bg-card dark:dark:bg-card/50">
            {primaryPhoto ? (
              <OptimizedImage
                src={primaryPhoto.url}
                alt={bounty.user.profile?.display_name || "User"}
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <User className="h-24 w-24 text-muted-foreground dark:text-foreground dark:text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <h2 className="text-2xl font-bold text-white">
                {bounty.user.profile?.display_name || bounty.user.name},{" "}
                {bounty.user.profile?.age}
              </h2>
              <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                 {bounty.user.profile?.gender}
              </p>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
             {bounty.user.profile?.bio && (
                 <div className="dark:bg-card/50 dark:dark:bg-card/30 p-4 rounded-lg border dark:border-border/20">
                    <p className="italic text-muted-foreground dark:text-muted-foreground">&quot;{bounty.user.profile.bio}&quot;</p>
                 </div>
             )}

            {/* Reward Badge */}
            <div className="flex items-center justify-between bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 p-4 rounded-xl border border-yellow-700/30 dark:border-yellow-700/20">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-500/20 dark:bg-yellow-500/10 p-2 rounded-full">
                  <Coins className="h-6 w-6 text-yellow-500 dark:text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-yellow-500 dark:text-yellow-600 uppercase font-semibold">
                    Reward
                  </p>
                  <p className="text-xl font-bold text-yellow-400 dark:text-yellow-500">
                    {bounty.token_reward} Tokens
                  </p>
                </div>
              </div>
              <div className="bg-pink-500/10 dark:bg-pink-900/20 px-3 py-1 rounded-full border border-pink-500/30 dark:border-pink-500/20">
                  <span className="text-pink-400 dark:text-pink-500 text-xs font-bold uppercase tracking-wider">Active</span>
              </div>
            </div>

            {/* Action Area */}
            {!showSuggestUI ? (
                <div className="space-y-3">
                    <Button
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-700 dark:to-purple-700 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-pink-900/20 dark:shadow-pink-950/30"
                        onClick={handleStartSuggestion}
                    >
                        <Heart className="mr-2 h-5 w-5" />
                        Suggest a Match
                    </Button>
                    
                    {!currentUser && (
                        <p className="text-xs text-center text-muted-foreground dark:text-muted-foreground">
                            Login or Register to suggest a friend for {bounty.user.profile?.display_name || "this user"}.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Select a Friend</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowSuggestUI(false)} className="dark:text-muted-foreground dark:hover:text-white dark:hover:dark:bg-card">Cancel</Button>
                     </div>

                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                        <Input 
                            placeholder="Search friends..." 
                            className="pl-9 dark:bg-card dark:dark:bg-card/50 dark:border-border dark:dark:border-border/50 text-white dark:text-foreground"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>

                     <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {friends.length === 0 ? (
                             <p className="text-center text-muted-foreground dark:text-muted-foreground py-4">No friends found. Add some friends first!</p>
                        ) : filteredFriends.length === 0 ? (
                             <p className="text-center text-muted-foreground dark:text-muted-foreground py-4">No matching friends.</p>
                        ) : (
                            filteredFriends.map(friend => (
                                <div 
                                    key={friend.id}
                                    onClick={() => setSelectedFriend(friend)}
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedFriend?.id === friend.id ? 'bg-pink-900/40 border border-pink-500/50 dark:bg-pink-950/50 dark:border-pink-700/50' : 'dark:bg-card dark:dark:bg-card/40 hover:dark:bg-muted dark:hover:dark:bg-muted/60'}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full overflow-hidden dark:bg-muted dark:bg-card flex items-center justify-center relative">
                                            {friend.avatar_url ? (
                                                <Image src={getAvatarUrl(friend.avatar_url, friend.name)} alt={friend.name} fill className="object-cover" />
                                            ) : (
                                                <span className="text-muted-foreground dark:text-muted-foreground font-bold">{friend.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{friend.name}</p>
                                            <p className="text-xs text-muted-foreground dark:text-muted-foreground">@{friend.username}</p>
                                        </div>
                                    </div>
                                    {selectedFriend?.id === friend.id && (
                                        <CheckCircle className="h-5 w-5 text-pink-500 dark:text-pink-600" />
                                    )}
                                </div>
                            ))
                        )}
                     </div>

                     <Button
                        className="w-full bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-800"
                        disabled={!selectedFriend || suggesting}
                        onClick={handleSuggest}
                     >
                         {suggesting ? "Sending..." : "Confirm Suggestion"}
                     </Button>
                </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
