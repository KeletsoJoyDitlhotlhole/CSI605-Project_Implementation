-- Table: public.Publication Author

-- DROP TABLE IF EXISTS public."Publication Author";

CREATE TABLE IF NOT EXISTS public."Publication Author"
(
    author_order integer NOT NULL,
    publication_id character varying(30) COLLATE pg_catalog."default" NOT NULL,
    publication_author_id character varying(150) COLLATE pg_catalog."default" NOT NULL,
    publication_author character varying(50) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Publication Author_pkey" PRIMARY KEY (publication_author_id),
    CONSTRAINT "Publication Author_publication_id_fkey" FOREIGN KEY (publication_id)
        REFERENCES public."Publications" (publication_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Publication Author"
    OWNER to postgres;





-- Table: public.Publications

-- DROP TABLE IF EXISTS public."Publications";

CREATE TABLE IF NOT EXISTS public."Publications"
(
    abstract text COLLATE pg_catalog."default" NOT NULL,
    keywords text COLLATE pg_catalog."default" NOT NULL,
    submitted_by character varying COLLATE pg_catalog."default" NOT NULL,
    status character varying(20) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    submitted_at timestamp with time zone,
    publication_id character varying(30) COLLATE pg_catalog."default" NOT NULL,
    publication_reference character varying(50) COLLATE pg_catalog."default" NOT NULL,
    title character varying(155) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Publications_pkey" PRIMARY KEY (publication_id),
    CONSTRAINT "Publications_submitted_by_fkey" FOREIGN KEY (submitted_by)
        REFERENCES public."Users" (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Publications"
    OWNER to postgres;





-- Table: public.Users

-- DROP TABLE IF EXISTS public."Users";

CREATE TABLE IF NOT EXISTS public."Users"
(
    firstname character varying(50) COLLATE pg_catalog."default" NOT NULL,
    created_at date NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id character varying(8) COLLATE pg_catalog."default" NOT NULL,
    surname character varying(50) COLLATE pg_catalog."default" NOT NULL,
    email character varying(50) COLLATE pg_catalog."default" NOT NULL,
    role character varying(50) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Users_pkey" PRIMARY KEY (user_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Users"
    OWNER to postgres;





-- Table: public.Publication File

-- DROP TABLE IF EXISTS public."Publication File";

CREATE TABLE IF NOT EXISTS public."Publication File"
(
    file_id character varying(30) COLLATE pg_catalog."default" NOT NULL,
    publication_id character varying(30) COLLATE pg_catalog."default" NOT NULL,
    original_filename character varying(255) COLLATE pg_catalog."default" NOT NULL,
    stored_filename character varying(255) COLLATE pg_catalog."default" NOT NULL,
    uploaded_at timestamp with time zone NOT NULL,
    uploaded_by character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT publication_file_pkey PRIMARY KEY (file_id),
    CONSTRAINT "Publication File_uploaded_by_fkey" FOREIGN KEY (uploaded_by)
        REFERENCES public."Users" (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT publication_file_publication_id_fkey FOREIGN KEY (publication_id)
        REFERENCES public."Publications" (publication_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Publication File"
    OWNER to postgres;