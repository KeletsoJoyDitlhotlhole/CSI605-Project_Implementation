--
-- PostgreSQL database dump
--

\restrict ApdsaELXLqwbteJssTA3Z6ov8YJ7rYwgScPJUIJNkiNMGrZS27ANOvaSBbYLy6T

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-10-02 06:39:26

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
-- TOC entry 221 (class 1259 OID 16433)
-- Name: Publication Author; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Publication Author" (
    author_order integer NOT NULL,
    publication_id character varying(30) NOT NULL,
    publication_author_id character varying(150) NOT NULL,
    publication_author character varying(50) NOT NULL
);


ALTER TABLE public."Publication Author" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16447)
-- Name: Publication File; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Publication File" (
    file_id character varying(30) NOT NULL,
    publication_id character varying(30) NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    uploaded_at timestamp with time zone NOT NULL,
    uploaded_by character varying NOT NULL
);


ALTER TABLE public."Publication File" OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16413)
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
    publication_id character varying(30) NOT NULL,
    publication_reference character varying(50) NOT NULL,
    title character varying(155) NOT NULL
);


ALTER TABLE public."Publications" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16400)
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    firstname character varying(50) NOT NULL,
    created_at date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id character varying(8) NOT NULL,
    surname character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    role character varying(50) NOT NULL
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- TOC entry 4929 (class 0 OID 16433)
-- Dependencies: 221
-- Data for Name: Publication Author; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Publication Author" (author_order, publication_id, publication_author_id, publication_author) FROM stdin;
1	PUB-d30774a010ee	PUB-d30774a010ee-1	Jane Doe
2	PUB-d30774a010ee	PUB-d30774a010ee-2	John Smith
1	PUB-373d647127f0	PUB-373d647127f0-1	Obakeng Mpopang
2	PUB-373d647127f0	PUB-373d647127f0-2	Bell Frost
1	PUB-dbdf4099facd	PUB-dbdf4099facd-1	Candy Segolo
2	PUB-dbdf4099facd	PUB-dbdf4099facd-2	Benni Seete
3	PUB-dbdf4099facd	PUB-dbdf4099facd-3	Carol Lekwati
\.


--
-- TOC entry 4930 (class 0 OID 16447)
-- Dependencies: 222
-- Data for Name: Publication File; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Publication File" (file_id, publication_id, original_filename, stored_filename, uploaded_at, uploaded_by) FROM stdin;
FILE-d30774a010ee	PUB-d30774a010ee	Test file.pdf	2dd7fa1f19b93cd1	2026-10-01 22:12:35.989719+02	U0000001
FILE-373d647127f0	PUB-373d647127f0	Test file.pdf	8626648db4050215	2026-10-02 01:52:21.818735+02	U0000001
FILE-dbdf4099facd	PUB-dbdf4099facd	Test file.pdf	4cfc6a3afb03f689	2026-10-02 06:25:11.900798+02	U0000001
\.


--
-- TOC entry 4928 (class 0 OID 16413)
-- Dependencies: 220
-- Data for Name: Publications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Publications" (abstract, keywords, submitted_by, status, created_at, updated_at, submitted_at, publication_id, publication_reference, title) FROM stdin;
Some abstract	AI	U0000001	submitted	2026-10-01 22:12:35.989719+02	\N	2026-10-01 22:12:35.989719+02	PUB-d30774a010ee	REF-2026-d30774a010ee	Test Paper
This is an abstract	AI, Machine Learning	U0000001	submitted	2026-10-02 01:52:21.818735+02	\N	2026-10-02 01:52:21.818735+02	PUB-373d647127f0	REF-2026-373d647127f0	My first writing
At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat	Cyber Security, Computer, Medicine	U0000001	submitted	2026-10-02 06:25:11.900798+02	\N	2026-10-02 06:25:11.900798+02	PUB-dbdf4099facd	REF-2026-dbdf4099facd	The introduction of money
\.


--
-- TOC entry 4927 (class 0 OID 16400)
-- Dependencies: 219
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (firstname, created_at, updated_at, user_id, surname, email, role) FROM stdin;
Tokyo	2026-10-01	2026-10-01 15:42:10.176805+02	U0000001	Nakamura	test@example.com	student
\.


--
-- TOC entry 4773 (class 2606 OID 16441)
-- Name: Publication Author Publication Author_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication Author"
    ADD CONSTRAINT "Publication Author_pkey" PRIMARY KEY (publication_author_id);


--
-- TOC entry 4771 (class 2606 OID 16427)
-- Name: Publications Publications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publications"
    ADD CONSTRAINT "Publications_pkey" PRIMARY KEY (publication_id);


--
-- TOC entry 4769 (class 2606 OID 16412)
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (user_id);


--
-- TOC entry 4775 (class 2606 OID 16459)
-- Name: Publication File publication_file_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication File"
    ADD CONSTRAINT publication_file_pkey PRIMARY KEY (file_id);


--
-- TOC entry 4777 (class 2606 OID 16442)
-- Name: Publication Author Publication Author_publication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication Author"
    ADD CONSTRAINT "Publication Author_publication_id_fkey" FOREIGN KEY (publication_id) REFERENCES public."Publications"(publication_id);


--
-- TOC entry 4778 (class 2606 OID 16460)
-- Name: Publication File Publication File_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication File"
    ADD CONSTRAINT "Publication File_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public."Users"(user_id);


--
-- TOC entry 4776 (class 2606 OID 16428)
-- Name: Publications Publications_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publications"
    ADD CONSTRAINT "Publications_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public."Users"(user_id);


--
-- TOC entry 4779 (class 2606 OID 16465)
-- Name: Publication File publication_file_publication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Publication File"
    ADD CONSTRAINT publication_file_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES public."Publications"(publication_id);


-- Completed on 2026-10-02 06:39:27

--
-- PostgreSQL database dump complete
--

\unrestrict ApdsaELXLqwbteJssTA3Z6ov8YJ7rYwgScPJUIJNkiNMGrZS27ANOvaSBbYLy6T

