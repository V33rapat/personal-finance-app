-- Baseline for the schema restored to Supabase before Prisma Migrate adoption.
-- Existing production databases record this migration as applied; they do not execute it.


-- Dumped from database version 17.10 (Debian 17.10-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS extensions;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: wallet_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_type AS ENUM (
    'normal',
    'investment'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    name character varying(100) NOT NULL,
    type public.transaction_type NOT NULL,
    color character varying(7),
    icon character varying(100),
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: transaction_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    wallet_id uuid,
    category_id uuid,
    name character varying(150) NOT NULL,
    type public.transaction_type NOT NULL,
    default_amount numeric(20,2),
    note text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    wallet_id uuid NOT NULL,
    category_id uuid,
    template_id uuid,
    name character varying(255) NOT NULL,
    type public.transaction_type NOT NULL,
    amount numeric(20,2) NOT NULL,
    note text,
    transaction_date date NOT NULL,
    metadata jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    from_wallet_id uuid NOT NULL,
    to_wallet_id uuid NOT NULL,
    from_transaction_id uuid,
    to_transaction_id uuid,
    amount numeric(20,2) NOT NULL,
    fee numeric(20,2) DEFAULT 0.00 NOT NULL,
    note text,
    transfer_date date NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(150) NOT NULL,
    avatar_url character varying(500),
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    email_verified_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    parent_wallet_id uuid,
    name character varying(150) NOT NULL,
    description text,
    wallet_type public.wallet_type DEFAULT 'normal'::public.wallet_type NOT NULL,
    balance numeric(20,2) DEFAULT 0.00 NOT NULL,
    currency character(3) DEFAULT 'THB'::bpchar NOT NULL,
    color character varying(7),
    icon character varying(100),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: transaction_templates transaction_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_templates
    ADD CONSTRAINT transaction_templates_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: idx_categories_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_type ON public.categories USING btree (user_id, type);


--
-- Name: idx_categories_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_user ON public.categories USING btree (user_id);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_transfers_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_date ON public.transfers USING btree (transfer_date DESC);


--
-- Name: idx_transfers_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_deleted_at ON public.transfers USING btree (deleted_at);


--
-- Name: idx_transfers_from_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_from_wallet ON public.transfers USING btree (from_wallet_id, transfer_date DESC);


--
-- Name: idx_transfers_to_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_to_wallet ON public.transfers USING btree (to_wallet_id, transfer_date DESC);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);


--
-- Name: transfers_from_transaction_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX transfers_from_transaction_id_key ON public.transfers USING btree (from_transaction_id);


--
-- Name: transfers_to_transaction_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX transfers_to_transaction_id_key ON public.transfers USING btree (to_transaction_id);


--
-- Name: uq_category_user_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_category_user_name ON public.categories USING btree (user_id, name, type);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transaction_templates transaction_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_templates
    ADD CONSTRAINT transaction_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: transaction_templates transaction_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_templates
    ADD CONSTRAINT transaction_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transaction_templates transaction_templates_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_templates
    ADD CONSTRAINT transaction_templates_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.transaction_templates(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;


--
-- Name: transfers transfers_from_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_from_transaction_id_fkey FOREIGN KEY (from_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: transfers transfers_from_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_from_wallet_id_fkey FOREIGN KEY (from_wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;


--
-- Name: transfers transfers_to_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_to_transaction_id_fkey FOREIGN KEY (to_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: transfers transfers_to_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_to_wallet_id_fkey FOREIGN KEY (to_wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;


--
-- Name: wallets wallets_parent_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_parent_wallet_id_fkey FOREIGN KEY (parent_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


