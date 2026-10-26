--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Publication Author; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Publication Author" (
    author_order integer NOT NULL,
    publication_id character varying(255) NOT NULL,
    publication_author_id character varying(150) NOT NULL,
    publication_author character varying(50) NOT NULL
);


ALTER TABLE public."Publication Author" OWNER TO postgres;

--
-- Name: Publication File; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Publication File" (
    file_id character varying(255) NOT NULL,
    publication_id character varying(255) NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    uploaded_at timestamp with time zone NOT NULL,
    uploaded_by character varying NOT NULL
);


ALTER TABLE public."Publication File" OWNER TO postgres;

--
-- Name: Publication Status History; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Publication Status History" (
    history_id bigint NOT NULL,
    publication_id character varying(255) NOT NULL,
    previous_status character varying(20),
    new_status character varying(20) NOT NULL,
    changed_by character varying(9) NOT NULL,
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    CONSTRAINT status_history_new_check CHECK (((new_status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Withdrawn'::character varying])::text[]))),
    CONSTRAINT status_history_previous_check CHECK (((previous_status IS NULL) OR ((previous_status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Withdrawn'::character varying])::text[]))))
);


ALTER TABLE public."Publication Status History" OWNER TO postgres;

--
-- Name: Publication Status History_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public."Publication Status History" ALTER COLUMN history_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Publication Status History_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Publications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Publications" (
    abstract text NOT NULL,
    keywords text NOT NULL,
    submitted_by character varying NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    submitted_at timestamp with time zone,
    publication_id character varying(255) NOT NULL,
    publication_reference character varying(50) NOT NULL,
    title character varying(155) NOT NULL,
    publication_type character varying(50),
    lecturer_id character varying(9),
    CONSTRAINT publications_type_check CHECK (((publication_type IS NULL) OR ((publication_type)::text = ANY ((ARRAY['Journal Article'::character varying, 'Conference Paper'::character varying, 'Thesis'::character varying, 'Dissertation'::character varying])::text[]))))
);


ALTER TABLE public."Publications" OWNER TO postgres;

--
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    firstname character varying(50) NOT NULL,
    created_at date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id character varying(9) NOT NULL,
    surname character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    role character varying(50) NOT NULL,
    supervisor_id character varying(9)
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- Data for Name: Publication Author; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Publication Author" (author_order, publication_id, publication_author_id, publication_author) FROM stdin;
1	PUB-1790801346754	AUTH-1790801346763-0-9077	Keletso Ditlhotlho
1	PUB-52ecb87d-b91a-432f-bae9-5d6c5f499a61	AUTH-0fdf0d8a-33d2-48a8-b1ee-5ed2efddb275	Keletso Ditlhotlhole
2	PUB-52ecb87d-b91a-432f-bae9-5d6c5f499a61	AUTH-b42661f4-6c09-4009-a756-31ff77d105eb	Joy Ditlhotlhole
1	PUB-1e976843-5b39-49e3-83bb-65f4dc64992c	AUTH-be1dfbf5-2a9a-42fd-8753-7b2b48b03c21	Atsile Ditlhotlhole
2	PUB-1e976843-5b39-49e3-83bb-65f4dc64992c	AUTH-a34da51b-12c6-4bc2-bc2a-b4c1a8e84a65	Prince Ditlhotlhole
\.


--
-- Data for Name: Publication File; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Publication File" (file_id, publication_id, original_filename, stored_filename, uploaded_at, uploaded_by) FROM stdin;
FILE-1790801346766-1481	PUB-1790801346754	pub1.pdf	1790801346644-848290733.pdf	2026-09-30 22:49:06.755044+02	02002023
FILE-02bed71a-1dae-4a2e-9cb5-ef82cf221d2f	PUB-52ecb87d-b91a-432f-bae9-5d6c5f499a61	journal.pdf	1792959149948-450336143.pdf	2026-10-25 22:12:29.993551+02	STU000001
FILE-431cc701-ba11-4c0e-9588-aaa89678abef	PUB-1e976843-5b39-49e3-83bb-65f4dc64992c	journal.pdf	1792959862386-862186709.pdf	2026-10-25 22:24:22.450321+02	STU000001
\.


--
-- Data for Name: Publication Status History; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Publication Status History" (history_id, publication_id, previous_status, new_status, changed_by, changed_at, comments) FROM stdin;
1	PUB-52ecb87d-b91a-432f-bae9-5d6c5f499a61	\N	Pending	STU000001	2026-10-25 22:12:29.993551+02	Publication submitted
2	PUB-1e976843-5b39-49e3-83bb-65f4dc64992c	\N	Pending	STU000001	2026-10-25 22:24:22.450321+02	Publication submitted
\.


--
-- Data for Name: Publications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Publications" (abstract, keywords, submitted_by, status, created_at, updated_at, submitted_at, publication_id, publication_reference, title, publication_type, lecturer_id) FROM stdin;
Abstract 1	Cloud Computing, Dev Ops	02002023	SUBMITTED	2026-09-30 22:49:06.755044+02	2026-09-30 22:49:06.755044+02	2026-09-30 22:49:06.755044+02	PUB-1790801346754	UB-PUB-2026-388D7F27	Pub 1	\N	\N
TEHE TESTS PUBLICATION ITERATION 2	Iteration. Testing	STU000001	Pending	2026-10-25 22:12:29.993551+02	2026-10-25 22:12:29.993551+02	2026-10-25 22:12:29.993551+02	PUB-52ecb87d-b91a-432f-bae9-5d6c5f499a61	UB-PUB-2026-4CAC67A6	KELETSO TESTS PUBLICATION ITERATION 2	Journal Article	LEC000001
JDUBGFGEBFUGEU JOY ITERATION DCDCJOD TESTS 2.1	Test, Iteration, Publication	STU000001	Pending	2026-10-25 22:24:22.450321+02	2026-10-25 22:24:22.450321+02	2026-10-25 22:24:22.450321+02	PUB-1e976843-5b39-49e3-83bb-65f4dc64992c	UB-PUB-2026-C6ABED98	JOY TESTS ITERATION 2.1	Conference Paper	LEC000001
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (firstname, created_at, updated_at, user_id, surname, email, role, supervisor_id) FROM stdin;
Keletso	2026-09-30	2026-09-30 21:26:14.937947+02	02002023	Ditlhotlhole	ditlhotlholekeletso1@gmail.com	Student	\N
Kabelo	2026-10-25	2026-10-25 21:19:33.322744+02	LEC000001	Molefe	kabelo.molefe@example.com	Lecturer	\N
Naledi	2026-10-25	2026-10-25 21:19:33.322744+02	LEC000002	Kgosidintsi	naledi.kgosidintsi@example.com	Lecturer	\N
Thabo	2026-10-25	2026-10-25 21:19:33.322744+02	ADM000001	Motsumi	thabo.motsumi@example.com	System Admin	\N
Lesego	2026-10-25	2026-10-25 21:19:33.322744+02	ADM000002	Banda	lesego.banda@example.com	System Admin	\N
Thato	2026-10-25	2026-10-25 21:19:33.322744+02	STU000001	Mooketsi	thato.mooketsi@example.com	Student	LEC000001
Boitumelo	2026-10-25	2026-10-25 21:19:33.322744+02	STU000002	Seboni	boitumelo.seboni@example.com	Student	LEC000002
\.


--
-- Name: Publication Status History_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Publication Status History_history_id_seq"', 2, true);


--
-- Name: Publication Author Publication Author_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication Author"
    ADD CONSTRAINT "Publication Author_pkey" PRIMARY KEY (publication_author_id);


--
-- Name: Publication Status History Publication Status History_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication Status History"
    ADD CONSTRAINT "Publication Status History_pkey" PRIMARY KEY (history_id);


--
-- Name: Publications Publications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publications"
    ADD CONSTRAINT "Publications_pkey" PRIMARY KEY (publication_id);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (user_id);


--
-- Name: Publication File publication_file_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication File"
    ADD CONSTRAINT publication_file_pkey PRIMARY KEY (file_id);


--
-- Name: Publications publications_abstract_not_blank; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public."Publications"
    ADD CONSTRAINT publications_abstract_not_blank CHECK ((length(TRIM(BOTH FROM abstract)) > 0)) NOT VALID;


--
-- Name: Publications publications_keywords_not_blank; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public."Publications"
    ADD CONSTRAINT publications_keywords_not_blank CHECK ((length(TRIM(BOTH FROM keywords)) > 0)) NOT VALID;


--
-- Name: Publications publications_status_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public."Publications"
    ADD CONSTRAINT publications_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Withdrawn'::character varying])::text[]))) NOT VALID;


--
-- Name: Publications publications_title_not_blank; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public."Publications"
    ADD CONSTRAINT publications_title_not_blank CHECK ((length(TRIM(BOTH FROM title)) > 0)) NOT VALID;


--
-- Name: Publication Author Publication Author_publication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication Author"
    ADD CONSTRAINT "Publication Author_publication_id_fkey" FOREIGN KEY (publication_id) REFERENCES public."Publications"(publication_id) NOT VALID;


--
-- Name: Publication File Publication File_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication File"
    ADD CONSTRAINT "Publication File_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public."Users"(user_id) NOT VALID;


--
-- Name: Publications Publications_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publications"
    ADD CONSTRAINT "Publications_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public."Users"(user_id) NOT VALID;


--
-- Name: Publication File publication_file_publication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication File"
    ADD CONSTRAINT publication_file_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES public."Publications"(publication_id);


--
-- Name: Publications publications_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publications"
    ADD CONSTRAINT publications_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public."Users"(user_id);


--
-- Name: Publication Status History status_history_publication_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication Status History"
    ADD CONSTRAINT status_history_publication_fk FOREIGN KEY (publication_id) REFERENCES public."Publications"(publication_id);


--
-- Name: Publication Status History status_history_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication Status History"
    ADD CONSTRAINT status_history_user_fk FOREIGN KEY (changed_by) REFERENCES public."Users"(user_id);


--
-- Name: Users users_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT users_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public."Users"(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

