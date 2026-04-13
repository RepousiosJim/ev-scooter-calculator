export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	__InternalSupabase: {
		PostgrestVersion: '14.5';
	};
	public: {
		Tables: {
			activity_log: {
				Row: {
					details: Json | null;
					id: string;
					summary: string;
					timestamp: string;
					type: string;
				};
				Insert: {
					details?: Json | null;
					id: string;
					summary: string;
					timestamp?: string;
					type: string;
				};
				Update: {
					details?: Json | null;
					id?: string;
					summary?: string;
					timestamp?: string;
					type?: string;
				};
				Relationships: [];
			};
			discovery_entries: {
				Row: {
					candidate_key: string | null;
					discovered_at: string;
					discovery_run_id: string | null;
					disposition: string | null;
					extraction_method: string | null;
					id: string;
					is_known: boolean;
					manufacturer: string;
					manufacturer_id: string;
					matched_key: string | null;
					name: string;
					specs: Json;
					url: string;
					year: number | null;
				};
				Insert: {
					candidate_key?: string | null;
					discovered_at?: string;
					discovery_run_id?: string | null;
					disposition?: string | null;
					extraction_method?: string | null;
					id: string;
					is_known?: boolean;
					manufacturer: string;
					manufacturer_id: string;
					matched_key?: string | null;
					name: string;
					specs?: Json;
					url: string;
					year?: number | null;
				};
				Update: {
					candidate_key?: string | null;
					discovered_at?: string;
					discovery_run_id?: string | null;
					disposition?: string | null;
					extraction_method?: string | null;
					id?: string;
					is_known?: boolean;
					manufacturer?: string;
					manufacturer_id?: string;
					matched_key?: string | null;
					name?: string;
					specs?: Json;
					url?: string;
					year?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'discovery_entries_discovery_run_id_fkey';
						columns: ['discovery_run_id'];
						isOneToOne: false;
						referencedRelation: 'discovery_runs';
						referencedColumns: ['id'];
					},
				];
			};
			discovery_runs: {
				Row: {
					candidates_created: number;
					completed_at: string | null;
					errors: string[];
					id: string;
					manufacturer_ids: string[];
					started_at: string;
					status: string;
					total_found: number;
					total_known: number;
					total_new: number;
				};
				Insert: {
					candidates_created?: number;
					completed_at?: string | null;
					errors?: string[];
					id: string;
					manufacturer_ids?: string[];
					started_at?: string;
					status?: string;
					total_found?: number;
					total_known?: number;
					total_new?: number;
				};
				Update: {
					candidates_created?: number;
					completed_at?: string | null;
					errors?: string[];
					id?: string;
					manufacturer_ids?: string[];
					started_at?: string;
					status?: string;
					total_found?: number;
					total_known?: number;
					total_new?: number;
				};
				Relationships: [];
			};
			newsletter_subscribers: {
				Row: {
					email: string;
					preferences: string[];
					subscribed_at: string;
					updated_at: string;
				};
				Insert: {
					email: string;
					preferences?: string[];
					subscribed_at?: string;
					updated_at?: string;
				};
				Update: {
					email?: string;
					preferences?: string[];
					subscribed_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			preset_candidates: {
				Row: {
					config: Json;
					created_at: string;
					key: string;
					manufacturer_specs: Json;
					name: string;
					notes: string | null;
					sources: Json;
					status: string;
					updated_at: string;
					validation: Json;
					year: number;
				};
				Insert: {
					config?: Json;
					created_at?: string;
					key: string;
					manufacturer_specs?: Json;
					name: string;
					notes?: string | null;
					sources?: Json;
					status?: string;
					updated_at?: string;
					validation?: Json;
					year: number;
				};
				Update: {
					config?: Json;
					created_at?: string;
					key?: string;
					manufacturer_specs?: Json;
					name?: string;
					notes?: string | null;
					sources?: Json;
					status?: string;
					updated_at?: string;
					validation?: Json;
					year?: number;
				};
				Relationships: [];
			};
			scooter_verifications: {
				Row: {
					fields: Json;
					last_updated: string;
					overall_confidence: number;
					price_history: Json;
					scooter_key: string;
				};
				Insert: {
					fields?: Json;
					last_updated?: string;
					overall_confidence?: number;
					price_history?: Json;
					scooter_key: string;
				};
				Update: {
					fields?: Json;
					last_updated?: string;
					overall_confidence?: number;
					price_history?: Json;
					scooter_key?: string;
				};
				Relationships: [];
			};
			url_health: {
				Row: {
					consecutive_failures: number;
					is_disabled: boolean;
					last_checked: string;
					last_error: string | null;
					last_status: number;
					last_success: string | null;
					products_found_last: number;
					url: string;
				};
				Insert: {
					consecutive_failures?: number;
					is_disabled?: boolean;
					last_checked?: string;
					last_error?: string | null;
					last_status?: number;
					last_success?: string | null;
					products_found_last?: number;
					url: string;
				};
				Update: {
					consecutive_failures?: number;
					is_disabled?: boolean;
					last_checked?: string;
					last_error?: string | null;
					last_status?: number;
					last_success?: string | null;
					products_found_last?: number;
					url?: string;
				};
				Relationships: [];
			};
			rate_limits: {
				Row: {
					key: string;
					count: number;
					window_start: number;
				};
				Insert: {
					key: string;
					count?: number;
					window_start: number;
				};
				Update: {
					key?: string;
					count?: number;
					window_start?: number;
				};
				Relationships: [];
			};
			revoked_nonces: {
				Row: {
					nonce: string;
					expiry: number;
				};
				Insert: {
					nonce: string;
					expiry: number;
				};
				Update: {
					nonce?: string;
					expiry?: number;
				};
				Relationships: [];
			};
		};
		Views: { [_ in never]: never };
		Functions: {
			check_rate_limit_atomic: {
				Args: {
					p_key: string;
					p_max: number;
					p_now: number;
					p_window_ms: number;
				};
				Returns: Array<{
					allowed: boolean;
					remaining: number;
					reset_at: number;
				}>;
			};
		};
		Enums: { [_ in never]: never };
		CompositeTypes: { [_ in never]: never };
	};
};
