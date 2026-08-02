export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  home_city: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  website?: string | null;
  instagram?: string | null;
  spotify_url?: string | null;
  favourite_genres?: string[] | null;
  created_at?: string;
};

export type Gig = {
  id: string;
  user_id: string;
  artist_name: string;
  venue_name: string;
  festival_name: string | null;
  festival_artists?: { name: string; seen: boolean; setlist?: string; setlistUrl?: string }[] | null;
  event_date: string;
  event_type?: 'gig' | 'festival' | 'club-night' | 'comedy' | 'other';
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ticket_url?: string | null;
  photo_urls?: string[] | null;
  is_public?: boolean;
  overall_rating: number;
  performance_rating: number | null;
  sound_rating: number | null;
  crowd_rating: number | null;
  venue_rating: number | null;
  value_rating: number | null;
  notes: string | null;
  setlist: string | null;
  created_at: string;
  profiles?: { username: string; display_name: string | null; avatar_url?: string | null } | null;
  review_likes?: { user_id: string }[];
  comments?: { id: string }[];
};

export type Comment = {
  id: string;
  gig_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { username: string; display_name: string | null } | null;
};
