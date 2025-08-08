--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4
-- Dumped by pg_dump version 15.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: insert_user_funds(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insert_user_funds() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO user_funds (uuid, name, discord_id)
  VALUES (NEW.uuid, NEW.name, NEW.discord_id)
  ON CONFLICT (uuid) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.insert_user_funds() OWNER TO postgres;

--
-- Name: sync_user_funds(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_user_funds() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE user_funds
  SET name = NEW.name,
      discord_id = NEW.discord_id
  WHERE uuid = NEW.uuid;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_user_funds() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    discord_id text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    vanished boolean DEFAULT false
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admins_id_seq OWNER TO postgres;

--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: ai_message_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_message_log (
    id integer NOT NULL,
    discord_id text NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_message_log OWNER TO postgres;

--
-- Name: ai_message_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_message_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_message_log_id_seq OWNER TO postgres;

--
-- Name: ai_message_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_message_log_id_seq OWNED BY public.ai_message_log.id;


--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id integer NOT NULL,
    mc_name character varying(255) NOT NULL,
    dc_name character varying(255) NOT NULL,
    age integer NOT NULL,
    how_found text,
    experience text,
    why_join text NOT NULL,
    submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.applications_id_seq OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: chat_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_tokens (
    token text NOT NULL,
    discord_id text NOT NULL,
    discord_name text,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.chat_tokens OWNER TO postgres;

--
-- Name: clicker_game_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clicker_game_data (
    discord_id text NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    tool text DEFAULT 'hand'::text NOT NULL,
    inventory text[] DEFAULT ARRAY['hand'::text] NOT NULL,
    materials jsonb DEFAULT '{}'::jsonb NOT NULL,
    auto_click_level integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    furnace_level integer DEFAULT 0,
    coal_reserve numeric DEFAULT 0,
    smelting_queue jsonb DEFAULT '[]'::jsonb,
    last_logout_at timestamp without time zone DEFAULT now(),
    smelt_amounts jsonb DEFAULT '{}'::jsonb NOT NULL,
    offline_earnings_level integer DEFAULT 0
);


ALTER TABLE public.clicker_game_data OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    founder_uuid uuid,
    name text NOT NULL,
    description character varying(10000),
    created_at timestamp without time zone DEFAULT now(),
    short_description character varying(128),
    CONSTRAINT chk_company_id_range CHECK (((id >= 1000) AND (id <= 9999)))
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_balance_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_balance_history (
    id integer NOT NULL,
    company_id integer,
    balance numeric(20,8) NOT NULL,
    recorded_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.company_balance_history OWNER TO postgres;

--
-- Name: company_balance_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_balance_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_balance_history_id_seq OWNER TO postgres;

--
-- Name: company_balance_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_balance_history_id_seq OWNED BY public.company_balance_history.id;


--
-- Name: company_edits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_edits (
    id bigint NOT NULL,
    company_id integer,
    editor_uuid uuid,
    name text,
    description text,
    short_description character varying(128),
    logo_path text,
    banner_path text,
    gallery_paths text[],
    status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone,
    reviewed_by uuid,
    fee_required numeric(20,8),
    fee_checked_at timestamp without time zone,
    reason text
);


ALTER TABLE public.company_edits OWNER TO postgres;

--
-- Name: company_edits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_edits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_edits_id_seq OWNER TO postgres;

--
-- Name: company_edits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_edits_id_seq OWNED BY public.company_edits.id;


--
-- Name: company_funds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_funds (
    company_id integer NOT NULL,
    balance numeric(20,8) DEFAULT 0 NOT NULL
);


ALTER TABLE public.company_funds OWNER TO postgres;

--
-- Name: company_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_images (
    id integer NOT NULL,
    company_id integer,
    url text NOT NULL,
    type text DEFAULT 'gallery'::text,
    "position" integer DEFAULT 0,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.company_images OWNER TO postgres;

--
-- Name: company_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_images_id_seq OWNER TO postgres;

--
-- Name: company_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_images_id_seq OWNED BY public.company_images.id;


--
-- Name: company_interest_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_interest_ledger (
    id bigint NOT NULL,
    company_id integer NOT NULL,
    interest_amount numeric(20,8) NOT NULL,
    rate_per_hour numeric(12,8) NOT NULL,
    balance_before numeric(20,8) NOT NULL,
    balance_after numeric(20,8) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.company_interest_ledger OWNER TO postgres;

--
-- Name: company_interest_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_interest_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_interest_ledger_id_seq OWNER TO postgres;

--
-- Name: company_interest_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_interest_ledger_id_seq OWNED BY public.company_interest_ledger.id;


--
-- Name: company_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_members (
    user_uuid uuid NOT NULL,
    company_id integer NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.company_members OWNER TO postgres;

--
-- Name: company_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_transactions (
    id integer NOT NULL,
    company_id integer,
    user_uuid uuid,
    type text,
    amount numeric(20,8),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.company_transactions OWNER TO postgres;

--
-- Name: company_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_transactions_id_seq OWNER TO postgres;

--
-- Name: company_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_transactions_id_seq OWNED BY public.company_transactions.id;


--
-- Name: crypto_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crypto_tokens (
    id integer NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    description text,
    total_supply numeric(20,6) NOT NULL,
    available_supply numeric(20,6) NOT NULL,
    price_per_unit numeric(20,6) NOT NULL,
    is_memecoin boolean DEFAULT false,
    crashed timestamp without time zone
);


ALTER TABLE public.crypto_tokens OWNER TO postgres;

--
-- Name: crypto_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crypto_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.crypto_tokens_id_seq OWNER TO postgres;

--
-- Name: crypto_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crypto_tokens_id_seq OWNED BY public.crypto_tokens.id;


--
-- Name: currency_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currency_transactions (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    action text NOT NULL,
    amount integer NOT NULL,
    from_uuid uuid,
    to_uuid uuid,
    denomination integer,
    count integer,
    balance_after integer,
    "timestamp" timestamp without time zone DEFAULT now(),
    CONSTRAINT currency_transactions_action_check CHECK ((action = ANY (ARRAY['deposit'::text, 'withdraw'::text, 'pay'::text]))),
    CONSTRAINT currency_transactions_amount_check CHECK ((amount > 0))
);


ALTER TABLE public.currency_transactions OWNER TO postgres;

--
-- Name: currency_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.currency_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.currency_transactions_id_seq OWNER TO postgres;

--
-- Name: currency_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.currency_transactions_id_seq OWNED BY public.currency_transactions.id;


--
-- Name: daily_player_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_player_stats (
    uuid uuid NOT NULL,
    stat_type text NOT NULL,
    stat_key text NOT NULL,
    stat_date date DEFAULT CURRENT_DATE NOT NULL,
    value bigint NOT NULL
);


ALTER TABLE public.daily_player_stats OWNER TO postgres;

--
-- Name: daily_playtime; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_playtime (
    uuid uuid NOT NULL,
    play_date date NOT NULL,
    seconds_played double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public.daily_playtime OWNER TO postgres;

--
-- Name: daily_rewards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_rewards (
    discord_id text NOT NULL,
    last_claim_at timestamp without time zone NOT NULL
);


ALTER TABLE public.daily_rewards OWNER TO postgres;

--
-- Name: daily_shared_quests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_shared_quests (
    id integer NOT NULL,
    quest_date date DEFAULT CURRENT_DATE NOT NULL,
    quest_type text NOT NULL,
    quest_key text NOT NULL,
    target_count integer NOT NULL,
    progress_count integer DEFAULT 0 NOT NULL,
    description text,
    discord_message_id text
);


ALTER TABLE public.daily_shared_quests OWNER TO postgres;

--
-- Name: daily_shared_quests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_shared_quests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.daily_shared_quests_id_seq OWNER TO postgres;

--
-- Name: daily_shared_quests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_shared_quests_id_seq OWNED BY public.daily_shared_quests.id;


--
-- Name: item_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_categories (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.item_categories OWNER TO postgres;

--
-- Name: item_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.item_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.item_categories_id_seq OWNER TO postgres;

--
-- Name: item_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.item_categories_id_seq OWNED BY public.item_categories.id;


--
-- Name: item_category_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_category_map (
    item_id integer NOT NULL,
    category_id integer NOT NULL
);


ALTER TABLE public.item_category_map OWNER TO postgres;

--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id integer NOT NULL,
    shop_id integer,
    name text NOT NULL,
    description text,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.items_id_seq OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: job_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_history (
    id integer NOT NULL,
    job_name text NOT NULL,
    last_run timestamp without time zone NOT NULL
);


ALTER TABLE public.job_history OWNER TO postgres;

--
-- Name: job_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.job_history_id_seq OWNER TO postgres;

--
-- Name: job_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_history_id_seq OWNED BY public.job_history.id;


--
-- Name: leaderboard_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leaderboard_messages (
    id integer NOT NULL,
    type text NOT NULL,
    channel_id text NOT NULL,
    message_id text NOT NULL
);


ALTER TABLE public.leaderboard_messages OWNER TO postgres;

--
-- Name: leaderboard_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leaderboard_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leaderboard_messages_id_seq OWNER TO postgres;

--
-- Name: leaderboard_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leaderboard_messages_id_seq OWNED BY public.leaderboard_messages.id;


--
-- Name: lottery_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lottery_participants (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    name text NOT NULL,
    amount integer NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lottery_participants_amount_check CHECK ((amount >= 10))
);


ALTER TABLE public.lottery_participants OWNER TO postgres;

--
-- Name: lottery_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lottery_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lottery_participants_id_seq OWNER TO postgres;

--
-- Name: lottery_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lottery_participants_id_seq OWNED BY public.lottery_participants.id;


--
-- Name: memecoin_tax_tracker; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memecoin_tax_tracker (
    id integer NOT NULL,
    total_collected numeric(20,6) DEFAULT 0 NOT NULL
);


ALTER TABLE public.memecoin_tax_tracker OWNER TO postgres;

--
-- Name: memecoin_tax_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.memecoin_tax_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.memecoin_tax_tracker_id_seq OWNER TO postgres;

--
-- Name: memecoin_tax_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.memecoin_tax_tracker_id_seq OWNED BY public.memecoin_tax_tracker.id;


--
-- Name: mob_limit_reached; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mob_limit_reached (
    uuid uuid NOT NULL,
    date_reached date NOT NULL
);


ALTER TABLE public.mob_limit_reached OWNER TO postgres;

--
-- Name: pending_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pending_companies (
    id integer NOT NULL,
    founder_uuid uuid,
    name text NOT NULL,
    description text,
    short_description character varying(128),
    logo_url text,
    banner_url text,
    gallery_urls text[],
    created_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    reviewed_at timestamp without time zone,
    reviewed_by uuid,
    fee_required numeric(20,8),
    fee_checked_at timestamp without time zone,
    CONSTRAINT chk_id_range CHECK (((id >= 1000) AND (id <= 9999)))
);


ALTER TABLE public.pending_companies OWNER TO postgres;

--
-- Name: pending_companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pending_companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pending_companies_id_seq OWNER TO postgres;

--
-- Name: pending_companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pending_companies_id_seq OWNED BY public.pending_companies.id;


--
-- Name: player_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_stats (
    uuid uuid NOT NULL,
    stat_type text NOT NULL,
    stat_key text NOT NULL,
    value bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.player_stats OWNER TO postgres;

--
-- Name: rcon_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rcon_logs (
    id integer NOT NULL,
    discord_id text NOT NULL,
    mc_name text NOT NULL,
    command text NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rcon_logs OWNER TO postgres;

--
-- Name: rcon_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rcon_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rcon_logs_id_seq OWNER TO postgres;

--
-- Name: rcon_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rcon_logs_id_seq OWNED BY public.rcon_logs.id;


--
-- Name: rejected_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rejected_companies (
    id integer NOT NULL,
    founder_uuid uuid,
    name text NOT NULL,
    reason text NOT NULL,
    rejected_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rejected_companies OWNER TO postgres;

--
-- Name: rejected_company_edits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rejected_company_edits (
    id bigint NOT NULL,
    company_id integer NOT NULL,
    editor_uuid uuid NOT NULL,
    reason text NOT NULL,
    rejected_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rejected_company_edits OWNER TO postgres;

--
-- Name: server_playtime_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.server_playtime_snapshots (
    id integer NOT NULL,
    total_seconds numeric NOT NULL,
    snapshot_time timestamp without time zone DEFAULT now()
);


ALTER TABLE public.server_playtime_snapshots OWNER TO postgres;

--
-- Name: server_playtime_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.server_playtime_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.server_playtime_snapshots_id_seq OWNER TO postgres;

--
-- Name: server_playtime_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.server_playtime_snapshots_id_seq OWNED BY public.server_playtime_snapshots.id;


--
-- Name: shop_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shop_images (
    id integer NOT NULL,
    shop_id integer,
    url text NOT NULL,
    type text DEFAULT 'gallery'::text,
    "position" integer DEFAULT 0,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shop_images OWNER TO postgres;

--
-- Name: shop_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shop_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shop_images_id_seq OWNER TO postgres;

--
-- Name: shop_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shop_images_id_seq OWNED BY public.shop_images.id;


--
-- Name: shops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shops (
    id integer NOT NULL,
    company_id integer,
    name text NOT NULL,
    description text,
    is_paid boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shops OWNER TO postgres;

--
-- Name: shops_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shops_id_seq OWNER TO postgres;

--
-- Name: shops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shops_id_seq OWNED BY public.shops.id;


--
-- Name: ticket_counter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_counter (
    id integer NOT NULL,
    last_number integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.ticket_counter OWNER TO postgres;

--
-- Name: ticket_counter_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_counter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_counter_id_seq OWNER TO postgres;

--
-- Name: ticket_counter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_counter_id_seq OWNED BY public.ticket_counter.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    ticket_number integer NOT NULL,
    discord_id text NOT NULL,
    mc_name text,
    channel_id text NOT NULL,
    status text DEFAULT 'open'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    admin_message_id text
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tickets_id_seq OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: token_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_metrics (
    id integer NOT NULL,
    token_id integer,
    snapshot bigint NOT NULL,
    last_price numeric(20,6) NOT NULL,
    recorded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.token_metrics OWNER TO postgres;

--
-- Name: token_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_metrics_id_seq OWNER TO postgres;

--
-- Name: token_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_metrics_id_seq OWNED BY public.token_metrics.id;


--
-- Name: token_price_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_price_alerts (
    id integer NOT NULL,
    discord_id text NOT NULL,
    token_symbol text NOT NULL,
    target_price numeric(20,6) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    direction character varying(10) DEFAULT 'above'::character varying
);


ALTER TABLE public.token_price_alerts OWNER TO postgres;

--
-- Name: token_price_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_price_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_price_alerts_id_seq OWNER TO postgres;

--
-- Name: token_price_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_price_alerts_id_seq OWNED BY public.token_price_alerts.id;


--
-- Name: token_price_history_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_price_history_daily (
    id integer NOT NULL,
    token_id integer,
    price numeric(20,6) NOT NULL,
    recorded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.token_price_history_daily OWNER TO postgres;

--
-- Name: token_price_history_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_price_history_daily_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_price_history_daily_id_seq OWNER TO postgres;

--
-- Name: token_price_history_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_price_history_daily_id_seq OWNED BY public.token_price_history_daily.id;


--
-- Name: token_price_history_hourly; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_price_history_hourly (
    id integer NOT NULL,
    token_id integer,
    price numeric(20,6) NOT NULL,
    recorded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.token_price_history_hourly OWNER TO postgres;

--
-- Name: token_price_history_hourly_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_price_history_hourly_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_price_history_hourly_id_seq OWNER TO postgres;

--
-- Name: token_price_history_hourly_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_price_history_hourly_id_seq OWNED BY public.token_price_history_hourly.id;


--
-- Name: token_price_history_minutes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_price_history_minutes (
    id integer NOT NULL,
    token_id integer,
    price numeric(20,6) NOT NULL,
    recorded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.token_price_history_minutes OWNER TO postgres;

--
-- Name: token_price_history_minutes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_price_history_minutes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_price_history_minutes_id_seq OWNER TO postgres;

--
-- Name: token_price_history_minutes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_price_history_minutes_id_seq OWNED BY public.token_price_history_minutes.id;


--
-- Name: token_price_history_weekly; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_price_history_weekly (
    id integer NOT NULL,
    token_id integer,
    price numeric(20,6) NOT NULL,
    recorded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.token_price_history_weekly OWNER TO postgres;

--
-- Name: token_price_history_weekly_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_price_history_weekly_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_price_history_weekly_id_seq OWNER TO postgres;

--
-- Name: token_price_history_weekly_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_price_history_weekly_id_seq OWNED BY public.token_price_history_weekly.id;


--
-- Name: token_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_transactions (
    id integer NOT NULL,
    discord_id text,
    token_id integer,
    amount numeric(20,6) NOT NULL,
    price_at_transaction numeric(20,6) NOT NULL,
    type text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    CONSTRAINT token_transactions_type_check CHECK ((type = ANY (ARRAY['buy'::text, 'sell'::text])))
);


ALTER TABLE public.token_transactions OWNER TO postgres;

--
-- Name: token_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.token_transactions_id_seq OWNER TO postgres;

--
-- Name: token_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_transactions_id_seq OWNED BY public.token_transactions.id;


--
-- Name: user_funds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_funds (
    uuid uuid NOT NULL,
    balance numeric(20,8) DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT now(),
    name text,
    discord_id text
);


ALTER TABLE public.user_funds OWNER TO postgres;

--
-- Name: user_portfolio_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_portfolio_history (
    id integer NOT NULL,
    discord_id text NOT NULL,
    total_value numeric(20,2) NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_portfolio_history OWNER TO postgres;

--
-- Name: user_portfolio_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_portfolio_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_portfolio_history_id_seq OWNER TO postgres;

--
-- Name: user_portfolio_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_portfolio_history_id_seq OWNED BY public.user_portfolio_history.id;


--
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tokens (
    discord_id text NOT NULL,
    token_id integer NOT NULL,
    amount numeric(20,6) DEFAULT 0 NOT NULL,
    price_at_purchase numeric(20,2)
);


ALTER TABLE public.user_tokens OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    uuid uuid NOT NULL,
    name text NOT NULL,
    online boolean DEFAULT false NOT NULL,
    last_seen timestamp without time zone DEFAULT now(),
    discord_id text,
    play_time_seconds bigint DEFAULT 0,
    session_start timestamp without time zone,
    first_joined timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: verified_discords; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verified_discords (
    discord_id text NOT NULL
);


ALTER TABLE public.verified_discords OWNER TO postgres;

--
-- Name: visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visits (
    id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    count integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.visits OWNER TO postgres;

--
-- Name: visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.visits_id_seq OWNER TO postgres;

--
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.visits_id_seq OWNED BY public.visits.id;


--
-- Name: waitlist_emails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waitlist_emails (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    token text,
    discord_name text
);


ALTER TABLE public.waitlist_emails OWNER TO postgres;

--
-- Name: waitlist_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.waitlist_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.waitlist_emails_id_seq OWNER TO postgres;

--
-- Name: waitlist_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.waitlist_emails_id_seq OWNED BY public.waitlist_emails.id;


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: ai_message_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_message_log ALTER COLUMN id SET DEFAULT nextval('public.ai_message_log_id_seq'::regclass);


--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Name: company_balance_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_balance_history ALTER COLUMN id SET DEFAULT nextval('public.company_balance_history_id_seq'::regclass);


--
-- Name: company_edits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_edits ALTER COLUMN id SET DEFAULT nextval('public.company_edits_id_seq'::regclass);


--
-- Name: company_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_images ALTER COLUMN id SET DEFAULT nextval('public.company_images_id_seq'::regclass);


--
-- Name: company_interest_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_interest_ledger ALTER COLUMN id SET DEFAULT nextval('public.company_interest_ledger_id_seq'::regclass);


--
-- Name: company_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_transactions ALTER COLUMN id SET DEFAULT nextval('public.company_transactions_id_seq'::regclass);


--
-- Name: crypto_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_tokens ALTER COLUMN id SET DEFAULT nextval('public.crypto_tokens_id_seq'::regclass);


--
-- Name: currency_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currency_transactions ALTER COLUMN id SET DEFAULT nextval('public.currency_transactions_id_seq'::regclass);


--
-- Name: daily_shared_quests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_shared_quests ALTER COLUMN id SET DEFAULT nextval('public.daily_shared_quests_id_seq'::regclass);


--
-- Name: item_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_categories ALTER COLUMN id SET DEFAULT nextval('public.item_categories_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: job_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_history ALTER COLUMN id SET DEFAULT nextval('public.job_history_id_seq'::regclass);


--
-- Name: leaderboard_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard_messages ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_messages_id_seq'::regclass);


--
-- Name: lottery_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lottery_participants ALTER COLUMN id SET DEFAULT nextval('public.lottery_participants_id_seq'::regclass);


--
-- Name: memecoin_tax_tracker id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memecoin_tax_tracker ALTER COLUMN id SET DEFAULT nextval('public.memecoin_tax_tracker_id_seq'::regclass);


--
-- Name: rcon_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rcon_logs ALTER COLUMN id SET DEFAULT nextval('public.rcon_logs_id_seq'::regclass);


--
-- Name: server_playtime_snapshots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_playtime_snapshots ALTER COLUMN id SET DEFAULT nextval('public.server_playtime_snapshots_id_seq'::regclass);


--
-- Name: shop_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shop_images ALTER COLUMN id SET DEFAULT nextval('public.shop_images_id_seq'::regclass);


--
-- Name: shops id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops ALTER COLUMN id SET DEFAULT nextval('public.shops_id_seq'::regclass);


--
-- Name: ticket_counter id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_counter ALTER COLUMN id SET DEFAULT nextval('public.ticket_counter_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: token_metrics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_metrics ALTER COLUMN id SET DEFAULT nextval('public.token_metrics_id_seq'::regclass);


--
-- Name: token_price_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_alerts ALTER COLUMN id SET DEFAULT nextval('public.token_price_alerts_id_seq'::regclass);


--
-- Name: token_price_history_daily id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_daily ALTER COLUMN id SET DEFAULT nextval('public.token_price_history_daily_id_seq'::regclass);


--
-- Name: token_price_history_hourly id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_hourly ALTER COLUMN id SET DEFAULT nextval('public.token_price_history_hourly_id_seq'::regclass);


--
-- Name: token_price_history_minutes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_minutes ALTER COLUMN id SET DEFAULT nextval('public.token_price_history_minutes_id_seq'::regclass);


--
-- Name: token_price_history_weekly id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_weekly ALTER COLUMN id SET DEFAULT nextval('public.token_price_history_weekly_id_seq'::regclass);


--
-- Name: token_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_transactions ALTER COLUMN id SET DEFAULT nextval('public.token_transactions_id_seq'::regclass);


--
-- Name: user_portfolio_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_portfolio_history ALTER COLUMN id SET DEFAULT nextval('public.user_portfolio_history_id_seq'::regclass);


--
-- Name: visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits ALTER COLUMN id SET DEFAULT nextval('public.visits_id_seq'::regclass);


--
-- Name: waitlist_emails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_emails ALTER COLUMN id SET DEFAULT nextval('public.waitlist_emails_id_seq'::regclass);


--
-- Name: admins admins_discord_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_discord_id_key UNIQUE (discord_id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: ai_message_log ai_message_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_message_log
    ADD CONSTRAINT ai_message_log_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: chat_tokens chat_tokens_discord_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_tokens
    ADD CONSTRAINT chat_tokens_discord_id_key UNIQUE (discord_id);


--
-- Name: chat_tokens chat_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_tokens
    ADD CONSTRAINT chat_tokens_pkey PRIMARY KEY (token);


--
-- Name: clicker_game_data clicker_game_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clicker_game_data
    ADD CONSTRAINT clicker_game_data_pkey PRIMARY KEY (discord_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_balance_history company_balance_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_balance_history
    ADD CONSTRAINT company_balance_history_pkey PRIMARY KEY (id);


--
-- Name: company_edits company_edits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_edits
    ADD CONSTRAINT company_edits_pkey PRIMARY KEY (id);


--
-- Name: company_funds company_funds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_funds
    ADD CONSTRAINT company_funds_pkey PRIMARY KEY (company_id);


--
-- Name: company_images company_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_images
    ADD CONSTRAINT company_images_pkey PRIMARY KEY (id);


--
-- Name: company_interest_ledger company_interest_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_interest_ledger
    ADD CONSTRAINT company_interest_ledger_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_pkey PRIMARY KEY (user_uuid, company_id);


--
-- Name: company_transactions company_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_transactions
    ADD CONSTRAINT company_transactions_pkey PRIMARY KEY (id);


--
-- Name: crypto_tokens crypto_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_tokens
    ADD CONSTRAINT crypto_tokens_pkey PRIMARY KEY (id);


--
-- Name: crypto_tokens crypto_tokens_symbol_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_tokens
    ADD CONSTRAINT crypto_tokens_symbol_key UNIQUE (symbol);


--
-- Name: currency_transactions currency_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currency_transactions
    ADD CONSTRAINT currency_transactions_pkey PRIMARY KEY (id);


--
-- Name: daily_player_stats daily_player_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_player_stats
    ADD CONSTRAINT daily_player_stats_pkey PRIMARY KEY (uuid, stat_type, stat_key, stat_date);


--
-- Name: daily_playtime daily_playtime_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_playtime
    ADD CONSTRAINT daily_playtime_pkey PRIMARY KEY (uuid, play_date);


--
-- Name: daily_rewards daily_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_rewards
    ADD CONSTRAINT daily_rewards_pkey PRIMARY KEY (discord_id);


--
-- Name: daily_shared_quests daily_shared_quests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_shared_quests
    ADD CONSTRAINT daily_shared_quests_pkey PRIMARY KEY (id);


--
-- Name: daily_shared_quests daily_shared_quests_quest_date_quest_type_quest_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_shared_quests
    ADD CONSTRAINT daily_shared_quests_quest_date_quest_type_quest_key_key UNIQUE (quest_date, quest_type, quest_key);


--
-- Name: item_categories item_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_categories
    ADD CONSTRAINT item_categories_name_key UNIQUE (name);


--
-- Name: item_categories item_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_categories
    ADD CONSTRAINT item_categories_pkey PRIMARY KEY (id);


--
-- Name: item_category_map item_category_map_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_category_map
    ADD CONSTRAINT item_category_map_pkey PRIMARY KEY (item_id, category_id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: job_history job_history_job_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_history
    ADD CONSTRAINT job_history_job_name_key UNIQUE (job_name);


--
-- Name: job_history job_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_history
    ADD CONSTRAINT job_history_pkey PRIMARY KEY (id);


--
-- Name: leaderboard_messages leaderboard_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard_messages
    ADD CONSTRAINT leaderboard_messages_pkey PRIMARY KEY (id);


--
-- Name: leaderboard_messages leaderboard_messages_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboard_messages
    ADD CONSTRAINT leaderboard_messages_type_key UNIQUE (type);


--
-- Name: lottery_participants lottery_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lottery_participants
    ADD CONSTRAINT lottery_participants_pkey PRIMARY KEY (id);


--
-- Name: memecoin_tax_tracker memecoin_tax_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memecoin_tax_tracker
    ADD CONSTRAINT memecoin_tax_tracker_pkey PRIMARY KEY (id);


--
-- Name: mob_limit_reached mob_limit_reached_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mob_limit_reached
    ADD CONSTRAINT mob_limit_reached_pkey PRIMARY KEY (uuid);


--
-- Name: pending_companies pending_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_companies
    ADD CONSTRAINT pending_companies_pkey PRIMARY KEY (id);


--
-- Name: player_stats player_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_pkey PRIMARY KEY (uuid, stat_type, stat_key);


--
-- Name: rcon_logs rcon_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rcon_logs
    ADD CONSTRAINT rcon_logs_pkey PRIMARY KEY (id);


--
-- Name: rejected_companies rejected_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rejected_companies
    ADD CONSTRAINT rejected_companies_pkey PRIMARY KEY (id);


--
-- Name: rejected_company_edits rejected_company_edits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rejected_company_edits
    ADD CONSTRAINT rejected_company_edits_pkey PRIMARY KEY (id);


--
-- Name: server_playtime_snapshots server_playtime_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_playtime_snapshots
    ADD CONSTRAINT server_playtime_snapshots_pkey PRIMARY KEY (id);


--
-- Name: shop_images shop_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shop_images
    ADD CONSTRAINT shop_images_pkey PRIMARY KEY (id);


--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- Name: ticket_counter ticket_counter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_counter
    ADD CONSTRAINT ticket_counter_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: token_metrics token_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_metrics
    ADD CONSTRAINT token_metrics_pkey PRIMARY KEY (id);


--
-- Name: token_price_alerts token_price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_alerts
    ADD CONSTRAINT token_price_alerts_pkey PRIMARY KEY (id);


--
-- Name: token_price_history_daily token_price_history_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_daily
    ADD CONSTRAINT token_price_history_daily_pkey PRIMARY KEY (id);


--
-- Name: token_price_history_hourly token_price_history_hourly_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_hourly
    ADD CONSTRAINT token_price_history_hourly_pkey PRIMARY KEY (id);


--
-- Name: token_price_history_minutes token_price_history_minutes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_minutes
    ADD CONSTRAINT token_price_history_minutes_pkey PRIMARY KEY (id);


--
-- Name: token_price_history_weekly token_price_history_weekly_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_weekly
    ADD CONSTRAINT token_price_history_weekly_pkey PRIMARY KEY (id);


--
-- Name: token_transactions token_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_transactions
    ADD CONSTRAINT token_transactions_pkey PRIMARY KEY (id);


--
-- Name: companies unique_company_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT unique_company_name UNIQUE (name);


--
-- Name: users unique_discord_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_discord_id UNIQUE (discord_id);


--
-- Name: user_funds user_funds_discord_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_funds
    ADD CONSTRAINT user_funds_discord_id_unique UNIQUE (discord_id);


--
-- Name: user_funds user_funds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_funds
    ADD CONSTRAINT user_funds_pkey PRIMARY KEY (uuid);


--
-- Name: user_portfolio_history user_portfolio_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_portfolio_history
    ADD CONSTRAINT user_portfolio_history_pkey PRIMARY KEY (id);


--
-- Name: user_tokens user_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (discord_id, token_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uuid);


--
-- Name: verified_discords verified_discords_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verified_discords
    ADD CONSTRAINT verified_discords_pkey PRIMARY KEY (discord_id);


--
-- Name: visits visits_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_date_key UNIQUE (date);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: waitlist_emails waitlist_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_emails
    ADD CONSTRAINT waitlist_emails_email_key UNIQUE (email);


--
-- Name: waitlist_emails waitlist_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_emails
    ADD CONSTRAINT waitlist_emails_pkey PRIMARY KEY (id);


--
-- Name: idx_company_edits_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company_edits_company_id ON public.company_edits USING btree (company_id);


--
-- Name: idx_company_interest_ledger_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company_interest_ledger_company_id ON public.company_interest_ledger USING btree (company_id);


--
-- Name: idx_user_tokens_discord_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tokens_discord_id ON public.user_tokens USING btree (discord_id);


--
-- Name: idx_users_discord_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_discord_id ON public.users USING btree (discord_id);


--
-- Name: one_pending_edit_per_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX one_pending_edit_per_company ON public.company_edits USING btree (company_id) WHERE (status = 'pending'::text);


--
-- Name: users trigger_insert_user_funds; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_insert_user_funds AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.insert_user_funds();


--
-- Name: users trigger_update_user_funds; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_user_funds AFTER UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.sync_user_funds();


--
-- Name: clicker_game_data clicker_game_data_discord_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clicker_game_data
    ADD CONSTRAINT clicker_game_data_discord_id_fkey FOREIGN KEY (discord_id) REFERENCES public.users(discord_id);


--
-- Name: companies companies_owner_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_owner_uuid_fkey FOREIGN KEY (founder_uuid) REFERENCES public.users(uuid) ON DELETE CASCADE;


--
-- Name: company_balance_history company_balance_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_balance_history
    ADD CONSTRAINT company_balance_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_edits company_edits_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_edits
    ADD CONSTRAINT company_edits_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_edits company_edits_editor_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_edits
    ADD CONSTRAINT company_edits_editor_uuid_fkey FOREIGN KEY (editor_uuid) REFERENCES public.users(uuid) ON DELETE CASCADE;


--
-- Name: company_edits company_edits_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_edits
    ADD CONSTRAINT company_edits_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(uuid);


--
-- Name: company_funds company_funds_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_funds
    ADD CONSTRAINT company_funds_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_images company_images_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_images
    ADD CONSTRAINT company_images_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_interest_ledger company_interest_ledger_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_interest_ledger
    ADD CONSTRAINT company_interest_ledger_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_members company_members_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_members company_members_user_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES public.users(uuid) ON DELETE CASCADE;


--
-- Name: company_transactions company_transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_transactions
    ADD CONSTRAINT company_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: company_transactions company_transactions_user_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_transactions
    ADD CONSTRAINT company_transactions_user_uuid_fkey FOREIGN KEY (user_uuid) REFERENCES public.users(uuid);


--
-- Name: item_category_map item_category_map_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_category_map
    ADD CONSTRAINT item_category_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.item_categories(id);


--
-- Name: item_category_map item_category_map_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_category_map
    ADD CONSTRAINT item_category_map_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: items items_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: pending_companies pending_companies_founder_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_companies
    ADD CONSTRAINT pending_companies_founder_uuid_fkey FOREIGN KEY (founder_uuid) REFERENCES public.users(uuid) ON DELETE CASCADE;


--
-- Name: pending_companies pending_companies_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_companies
    ADD CONSTRAINT pending_companies_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(uuid);


--
-- Name: player_stats player_stats_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_uuid_fkey FOREIGN KEY (uuid) REFERENCES public.users(uuid) ON DELETE CASCADE;


--
-- Name: rejected_companies rejected_companies_founder_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rejected_companies
    ADD CONSTRAINT rejected_companies_founder_uuid_fkey FOREIGN KEY (founder_uuid) REFERENCES public.users(uuid) ON DELETE CASCADE;


--
-- Name: shop_images shop_images_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shop_images
    ADD CONSTRAINT shop_images_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shops shops_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: token_metrics token_metrics_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_metrics
    ADD CONSTRAINT token_metrics_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.crypto_tokens(id) ON DELETE CASCADE;


--
-- Name: token_price_history_daily token_price_history_daily_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_daily
    ADD CONSTRAINT token_price_history_daily_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.crypto_tokens(id) ON DELETE CASCADE;


--
-- Name: token_price_history_hourly token_price_history_hourly_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_hourly
    ADD CONSTRAINT token_price_history_hourly_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.crypto_tokens(id) ON DELETE CASCADE;


--
-- Name: token_price_history_minutes token_price_history_minutes_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_minutes
    ADD CONSTRAINT token_price_history_minutes_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.crypto_tokens(id) ON DELETE CASCADE;


--
-- Name: token_price_history_weekly token_price_history_weekly_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_price_history_weekly
    ADD CONSTRAINT token_price_history_weekly_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.crypto_tokens(id) ON DELETE CASCADE;


--
-- Name: token_transactions token_transactions_discord_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_transactions
    ADD CONSTRAINT token_transactions_discord_id_fkey FOREIGN KEY (discord_id) REFERENCES public.users(discord_id) ON DELETE CASCADE;


--
-- Name: token_transactions token_transactions_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_transactions
    ADD CONSTRAINT token_transactions_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.crypto_tokens(id) ON DELETE CASCADE;


--
-- Name: user_funds user_funds_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_funds
    ADD CONSTRAINT user_funds_uuid_fkey FOREIGN KEY (uuid) REFERENCES public.users(uuid);


--
-- Name: user_tokens user_tokens_discord_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_discord_id_fkey FOREIGN KEY (discord_id) REFERENCES public.users(discord_id) ON DELETE CASCADE;


--
-- Name: user_tokens user_tokens_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.crypto_tokens(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

