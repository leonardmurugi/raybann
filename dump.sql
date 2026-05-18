--
-- PostgreSQL database dump
--

\restrict shvnGtMel7MOkx6xXhBWrX2knCwMFcwuL59dNHJAsudbhisNaMEfOuKmPQPB80O

-- Dumped from database version 18.4 (Ubuntu 18.4-1.pgdg24.04+1)
-- Dumped by pg_dump version 18.4 (Ubuntu 18.4-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text NOT NULL,
    id_number text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.customers OWNER TO rayban_user;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO rayban_user;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    category text NOT NULL,
    amount numeric NOT NULL,
    description text,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    operator_id integer
);


ALTER TABLE public.expenses OWNER TO rayban_user;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO rayban_user;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    item_name text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    category text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory OWNER TO rayban_user;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO rayban_user;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: lands; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.lands (
    id integer NOT NULL,
    plot_number text NOT NULL,
    location text NOT NULL,
    size text NOT NULL,
    acquisition_type text NOT NULL,
    status text NOT NULL,
    total_cost numeric DEFAULT 0 NOT NULL,
    paid_amount numeric DEFAULT 0 NOT NULL,
    customer_id integer,
    title_deed_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lands_acquisition_type_check CHECK ((acquisition_type = ANY (ARRAY['purchase'::text, 'owned'::text]))),
    CONSTRAINT lands_status_check CHECK ((status = ANY (ARRAY['available'::text, 'sold'::text, 'pending'::text])))
);


ALTER TABLE public.lands OWNER TO rayban_user;

--
-- Name: lands_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.lands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lands_id_seq OWNER TO rayban_user;

--
-- Name: lands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.lands_id_seq OWNED BY public.lands.id;


--
-- Name: parent_properties; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.parent_properties (
    id integer NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    total_size text NOT NULL,
    ownership_status text DEFAULT 'partial'::text NOT NULL,
    buying_price numeric DEFAULT 0 NOT NULL,
    amount_paid_to_seller numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.parent_properties OWNER TO rayban_user;

--
-- Name: parent_properties_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.parent_properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parent_properties_id_seq OWNER TO rayban_user;

--
-- Name: parent_properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.parent_properties_id_seq OWNED BY public.parent_properties.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    category text NOT NULL,
    description text,
    reference_id integer,
    reference_type text,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    CONSTRAINT payments_type_check CHECK ((type = ANY (ARRAY['received'::text, 'made'::text])))
);


ALTER TABLE public.payments OWNER TO rayban_user;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO rayban_user;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: property_costs; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.property_costs (
    id integer NOT NULL,
    parent_property_id integer,
    land_id integer,
    category text NOT NULL,
    amount numeric NOT NULL,
    description text,
    is_approved boolean DEFAULT false,
    approved_by integer,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.property_costs OWNER TO rayban_user;

--
-- Name: property_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.property_costs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_costs_id_seq OWNER TO rayban_user;

--
-- Name: property_costs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.property_costs_id_seq OWNED BY public.property_costs.id;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.receipts (
    id integer NOT NULL,
    receipt_number text NOT NULL,
    payment_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.receipts OWNER TO rayban_user;

--
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.receipts_id_seq OWNER TO rayban_user;

--
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    land_id integer,
    customer_id integer,
    total_price numeric NOT NULL,
    paid_amount numeric DEFAULT 0 NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sales OWNER TO rayban_user;

--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_id_seq OWNER TO rayban_user;

--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: rayban_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'reception'::text, 'field'::text])))
);


ALTER TABLE public.users OWNER TO rayban_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: rayban_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO rayban_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rayban_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: lands id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.lands ALTER COLUMN id SET DEFAULT nextval('public.lands_id_seq'::regclass);


--
-- Name: parent_properties id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.parent_properties ALTER COLUMN id SET DEFAULT nextval('public.parent_properties_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: property_costs id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.property_costs ALTER COLUMN id SET DEFAULT nextval('public.property_costs_id_seq'::regclass);


--
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.customers (id, name, email, phone, id_number, created_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.expenses (id, category, amount, description, date, operator_id) FROM stdin;
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.inventory (id, item_name, quantity, unit_price, category, updated_at) FROM stdin;
\.


--
-- Data for Name: lands; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.lands (id, plot_number, location, size, acquisition_type, status, total_cost, paid_amount, customer_id, title_deed_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: parent_properties; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.parent_properties (id, name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.payments (id, type, amount, category, description, reference_id, reference_type, date, created_by) FROM stdin;
\.


--
-- Data for Name: property_costs; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.property_costs (id, parent_property_id, land_id, category, amount, description, is_approved, approved_by, date) FROM stdin;
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.receipts (id, receipt_number, payment_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.sales (id, land_id, customer_id, total_price, paid_amount, date) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: rayban_user
--

COPY public.users (id, email, password_hash, name, role, created_at) FROM stdin;
1	admin@rayban.com	$2b$10$XyFdv/OB4HdCrw2XzXW0B.15EvJweaLUKnKPdMON6WECKuiArGVoi	Admin	admin	2026-05-15 14:37:02.826079+03
\.


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, false);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.inventory_id_seq', 1, false);


--
-- Name: lands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.lands_id_seq', 1, false);


--
-- Name: parent_properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.parent_properties_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: property_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.property_costs_id_seq', 1, false);


--
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.receipts_id_seq', 1, false);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.sales_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: rayban_user
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: customers customers_id_number_key; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_id_number_key UNIQUE (id_number);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: lands lands_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.lands
    ADD CONSTRAINT lands_pkey PRIMARY KEY (id);


--
-- Name: lands lands_plot_number_key; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.lands
    ADD CONSTRAINT lands_plot_number_key UNIQUE (plot_number);


--
-- Name: parent_properties parent_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.parent_properties
    ADD CONSTRAINT parent_properties_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: property_costs property_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.property_costs
    ADD CONSTRAINT property_costs_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: property_costs property_costs_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.property_costs
    ADD CONSTRAINT property_costs_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: property_costs property_costs_land_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.property_costs
    ADD CONSTRAINT property_costs_land_id_fkey FOREIGN KEY (land_id) REFERENCES public.lands(id);


--
-- Name: property_costs property_costs_parent_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.property_costs
    ADD CONSTRAINT property_costs_parent_property_id_fkey FOREIGN KEY (parent_property_id) REFERENCES public.parent_properties(id);


--
-- Name: receipts receipts_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales sales_land_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rayban_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_land_id_fkey FOREIGN KEY (land_id) REFERENCES public.lands(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO rayban_user;


--
-- PostgreSQL database dump complete
--

\unrestrict shvnGtMel7MOkx6xXhBWrX2knCwMFcwuL59dNHJAsudbhisNaMEfOuKmPQPB80O

