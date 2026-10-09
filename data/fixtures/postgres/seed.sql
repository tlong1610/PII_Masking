--
-- Northwind + PIIGuard Shield synthetic PII (single seed file)
-- Load once:  docker exec -i p-138-db-1 psql -U postgres -d mydatabase -f /tmp/seed.sql
-- Or: docker cp data/fixtures/seed.sql p-138-db-1:/tmp/ && docker exec p-138-db-1 psql -U postgres -d mydatabase -v ON_ERROR_STOP=1 -f /tmp/seed.sql
--
-- Structure:
--   Part 1 = classic Northwind schema + data (without customer_customer_demo / customer_demographics)
--   Part 2 = ALTER/UPDATE + support_tickets + kyc_documents (synthetic VN PII)
-- Regenerate Part 2 only: python scripts/gen_northwind_pii_patch.py
--

--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;



SET default_tablespace = '';

SET default_with_oids = false;


---
--- drop tables
---


DROP TABLE IF EXISTS kyc_documents;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS employee_territories;
DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS shippers;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS territories;
DROP TABLE IF EXISTS us_states;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS region;
DROP TABLE IF EXISTS employees;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE categories (
    category_id smallint NOT NULL,
    category_name character varying(15) NOT NULL,
    description text,
    picture bytea
);






--
-- Name: customers; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE customers (
    customer_id character varying(5) NOT NULL,
    company_name character varying(40) NOT NULL,
    contact_name character varying(30),
    contact_title character varying(30),
    address character varying(60),
    city character varying(15),
    region character varying(15),
    postal_code character varying(10),
    country character varying(15),
    phone character varying(24),
    fax character varying(24)
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE employees (
    employee_id smallint NOT NULL,
    last_name character varying(20) NOT NULL,
    first_name character varying(10) NOT NULL,
    title character varying(30),
    title_of_courtesy character varying(25),
    birth_date date,
    hire_date date,
    address character varying(60),
    city character varying(15),
    region character varying(15),
    postal_code character varying(10),
    country character varying(15),
    home_phone character varying(24),
    extension character varying(4),
    photo bytea,
    notes text,
    reports_to smallint,
    photo_path character varying(255)
);


--
-- Name: employee_territories; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE employee_territories (
    employee_id smallint NOT NULL,
    territory_id character varying(20) NOT NULL
);




--
-- Name: order_details; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE order_details (
    order_id smallint NOT NULL,
    product_id smallint NOT NULL,
    unit_price real NOT NULL,
    quantity smallint NOT NULL,
    discount real NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE orders (
    order_id smallint NOT NULL,
    customer_id character varying(5),
    employee_id smallint,
    order_date date,
    required_date date,
    shipped_date date,
    ship_via smallint,
    freight real,
    ship_name character varying(40),
    ship_address character varying(60),
    ship_city character varying(15),
    ship_region character varying(15),
    ship_postal_code character varying(10),
    ship_country character varying(15)
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE products (
    product_id smallint NOT NULL,
    product_name character varying(40) NOT NULL,
    supplier_id smallint,
    category_id smallint,
    quantity_per_unit character varying(20),
    unit_price real,
    units_in_stock smallint,
    units_on_order smallint,
    reorder_level smallint,
    discontinued integer NOT NULL
);


--
-- Name: region; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE region (
    region_id smallint NOT NULL,
    region_description character varying(60) NOT NULL
);


--
-- Name: shippers; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE shippers (
    shipper_id smallint NOT NULL,
    company_name character varying(40) NOT NULL,
    phone character varying(24)
);



--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE suppliers (
    supplier_id smallint NOT NULL,
    company_name character varying(40) NOT NULL,
    contact_name character varying(30),
    contact_title character varying(30),
    address character varying(60),
    city character varying(15),
    region character varying(15),
    postal_code character varying(10),
    country character varying(15),
    phone character varying(24),
    fax character varying(24),
    homepage text
);


--
-- Name: territories; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE territories (
    territory_id character varying(20) NOT NULL,
    territory_description character varying(60) NOT NULL,
    region_id smallint NOT NULL
);


--
-- Name: us_states; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE us_states (
    state_id smallint NOT NULL,
    state_name character varying(100),
    state_abbr character varying(2),
    state_region character varying(50)
);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO categories VALUES (1, 'Beverages', 'Soft drinks, coffees, teas, beers, and ales', '\x');
INSERT INTO categories VALUES (2, 'Condiments', 'Sweet and savory sauces, relishes, spreads, and seasonings', '\x');
INSERT INTO categories VALUES (3, 'Confections', 'Desserts, candies, and sweet breads', '\x');
INSERT INTO categories VALUES (4, 'Dairy Products', 'Cheeses', '\x');
INSERT INTO categories VALUES (5, 'Grains/Cereals', 'Breads, crackers, pasta, and cereal', '\x');
INSERT INTO categories VALUES (6, 'Meat/Poultry', 'Prepared meats', '\x');
INSERT INTO categories VALUES (7, 'Produce', 'Dried fruit and bean curd', '\x');
INSERT INTO categories VALUES (8, 'Seafood', 'Seaweed and fish', '\x');








--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO customers VALUES ('ALFKI', 'Alfreds Futterkiste', 'Maria Anders', 'Sales Representative', 'Obere Str. 57', 'Berlin', NULL, '12209', 'Germany', '030-0074321', '030-0076545');
INSERT INTO customers VALUES ('ANATR', 'Ana Trujillo Emparedados y helados', 'Ana Trujillo', 'Owner', 'Avda. de la Constitución 2222', 'México D.F.', NULL, '05021', 'Mexico', '(5) 555-4729', '(5) 555-3745');
INSERT INTO customers VALUES ('ANTON', 'Antonio Moreno Taquería', 'Antonio Moreno', 'Owner', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico', '(5) 555-3932', NULL);
INSERT INTO customers VALUES ('AROUT', 'Around the Horn', 'Thomas Hardy', 'Sales Representative', '120 Hanover Sq.', 'London', NULL, 'WA1 1DP', 'UK', '(171) 555-7788', '(171) 555-6750');
INSERT INTO customers VALUES ('BERGS', 'Berglunds snabbköp', 'Christina Berglund', 'Order Administrator', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden', '0921-12 34 65', '0921-12 34 67');
INSERT INTO customers VALUES ('BLAUS', 'Blauer See Delikatessen', 'Hanna Moos', 'Sales Representative', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany', '0621-08460', '0621-08924');
INSERT INTO customers VALUES ('BLONP', 'Blondesddsl père et fils', 'Frédérique Citeaux', 'Marketing Manager', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France', '88.60.15.31', '88.60.15.32');
INSERT INTO customers VALUES ('BOLID', 'Bólido Comidas preparadas', 'Martín Sommer', 'Owner', 'C/ Araquil, 67', 'Madrid', NULL, '28023', 'Spain', '(91) 555 22 82', '(91) 555 91 99');
INSERT INTO customers VALUES ('BONAP', 'Bon app''', 'Laurence Lebihan', 'Owner', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France', '91.24.45.40', '91.24.45.41');
INSERT INTO customers VALUES ('BOTTM', 'Bottom-Dollar Markets', 'Elizabeth Lincoln', 'Accounting Manager', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada', '(604) 555-4729', '(604) 555-3745');
INSERT INTO customers VALUES ('BSBEV', 'B''s Beverages', 'Victoria Ashworth', 'Sales Representative', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK', '(171) 555-1212', NULL);
INSERT INTO customers VALUES ('CACTU', 'Cactus Comidas para llevar', 'Patricio Simpson', 'Sales Agent', 'Cerrito 333', 'Buenos Aires', NULL, '1010', 'Argentina', '(1) 135-5555', '(1) 135-4892');
INSERT INTO customers VALUES ('CENTC', 'Centro comercial Moctezuma', 'Francisco Chang', 'Marketing Manager', 'Sierras de Granada 9993', 'México D.F.', NULL, '05022', 'Mexico', '(5) 555-3392', '(5) 555-7293');
INSERT INTO customers VALUES ('CHOPS', 'Chop-suey Chinese', 'Yang Wang', 'Owner', 'Hauptstr. 29', 'Bern', NULL, '3012', 'Switzerland', '0452-076545', NULL);
INSERT INTO customers VALUES ('COMMI', 'Comércio Mineiro', 'Pedro Afonso', 'Sales Associate', 'Av. dos Lusíadas, 23', 'Sao Paulo', 'SP', '05432-043', 'Brazil', '(11) 555-7647', NULL);
INSERT INTO customers VALUES ('CONSH', 'Consolidated Holdings', 'Elizabeth Brown', 'Sales Representative', 'Berkeley Gardens 12  Brewery', 'London', NULL, 'WX1 6LT', 'UK', '(171) 555-2282', '(171) 555-9199');
INSERT INTO customers VALUES ('DRACD', 'Drachenblut Delikatessen', 'Sven Ottlieb', 'Order Administrator', 'Walserweg 21', 'Aachen', NULL, '52066', 'Germany', '0241-039123', '0241-059428');
INSERT INTO customers VALUES ('DUMON', 'Du monde entier', 'Janine Labrune', 'Owner', '67, rue des Cinquante Otages', 'Nantes', NULL, '44000', 'France', '40.67.88.88', '40.67.89.89');
INSERT INTO customers VALUES ('EASTC', 'Eastern Connection', 'Ann Devon', 'Sales Agent', '35 King George', 'London', NULL, 'WX3 6FW', 'UK', '(171) 555-0297', '(171) 555-3373');
INSERT INTO customers VALUES ('ERNSH', 'Ernst Handel', 'Roland Mendel', 'Sales Manager', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria', '7675-3425', '7675-3426');
INSERT INTO customers VALUES ('FAMIA', 'Familia Arquibaldo', 'Aria Cruz', 'Marketing Assistant', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil', '(11) 555-9857', NULL);
INSERT INTO customers VALUES ('FISSA', 'FISSA Fabrica Inter. Salchichas S.A.', 'Diego Roel', 'Accounting Manager', 'C/ Moralzarzal, 86', 'Madrid', NULL, '28034', 'Spain', '(91) 555 94 44', '(91) 555 55 93');
INSERT INTO customers VALUES ('FOLIG', 'Folies gourmandes', 'Martine Rancé', 'Assistant Sales Agent', '184, chaussée de Tournai', 'Lille', NULL, '59000', 'France', '20.16.10.16', '20.16.10.17');
INSERT INTO customers VALUES ('FOLKO', 'Folk och fä HB', 'Maria Larsson', 'Owner', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden', '0695-34 67 21', NULL);
INSERT INTO customers VALUES ('FRANK', 'Frankenversand', 'Peter Franken', 'Marketing Manager', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany', '089-0877310', '089-0877451');
INSERT INTO customers VALUES ('FRANR', 'France restauration', 'Carine Schmitt', 'Marketing Manager', '54, rue Royale', 'Nantes', NULL, '44000', 'France', '40.32.21.21', '40.32.21.20');
INSERT INTO customers VALUES ('FRANS', 'Franchi S.p.A.', 'Paolo Accorti', 'Sales Representative', 'Via Monte Bianco 34', 'Torino', NULL, '10100', 'Italy', '011-4988260', '011-4988261');
INSERT INTO customers VALUES ('FURIB', 'Furia Bacalhau e Frutos do Mar', 'Lino Rodriguez', 'Sales Manager', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal', '(1) 354-2534', '(1) 354-2535');
INSERT INTO customers VALUES ('GALED', 'Galería del gastrónomo', 'Eduardo Saavedra', 'Marketing Manager', 'Rambla de Cataluña, 23', 'Barcelona', NULL, '08022', 'Spain', '(93) 203 4560', '(93) 203 4561');
INSERT INTO customers VALUES ('GODOS', 'Godos Cocina Típica', 'José Pedro Freyre', 'Sales Manager', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain', '(95) 555 82 82', NULL);
INSERT INTO customers VALUES ('GOURL', 'Gourmet Lanchonetes', 'André Fonseca', 'Sales Associate', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil', '(11) 555-9482', NULL);
INSERT INTO customers VALUES ('GREAL', 'Great Lakes Food Market', 'Howard Snyder', 'Marketing Manager', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA', '(503) 555-7555', NULL);
INSERT INTO customers VALUES ('GROSR', 'GROSELLA-Restaurante', 'Manuel Pereira', 'Owner', '5ª Ave. Los Palos Grandes', 'Caracas', 'DF', '1081', 'Venezuela', '(2) 283-2951', '(2) 283-3397');
INSERT INTO customers VALUES ('HANAR', 'Hanari Carnes', 'Mario Pontes', 'Accounting Manager', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil', '(21) 555-0091', '(21) 555-8765');
INSERT INTO customers VALUES ('HILAA', 'HILARION-Abastos', 'Carlos Hernández', 'Sales Representative', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela', '(5) 555-1340', '(5) 555-1948');
INSERT INTO customers VALUES ('HUNGC', 'Hungry Coyote Import Store', 'Yoshi Latimer', 'Sales Representative', 'City Center Plaza 516 Main St.', 'Elgin', 'OR', '97827', 'USA', '(503) 555-6874', '(503) 555-2376');
INSERT INTO customers VALUES ('HUNGO', 'Hungry Owl All-Night Grocers', 'Patricia McKenna', 'Sales Associate', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland', '2967 542', '2967 3333');
INSERT INTO customers VALUES ('ISLAT', 'Island Trading', 'Helen Bennett', 'Marketing Manager', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK', '(198) 555-8888', NULL);
INSERT INTO customers VALUES ('KOENE', 'Königlich Essen', 'Philip Cramer', 'Sales Associate', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany', '0555-09876', NULL);
INSERT INTO customers VALUES ('LACOR', 'La corne d''abondance', 'Daniel Tonini', 'Sales Representative', '67, avenue de l''Europe', 'Versailles', NULL, '78000', 'France', '30.59.84.10', '30.59.85.11');
INSERT INTO customers VALUES ('LAMAI', 'La maison d''Asie', 'Annette Roulet', 'Sales Manager', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France', '61.77.61.10', '61.77.61.11');
INSERT INTO customers VALUES ('LAUGB', 'Laughing Bacchus Wine Cellars', 'Yoshi Tannamuri', 'Marketing Assistant', '1900 Oak St.', 'Vancouver', 'BC', 'V3F 2K1', 'Canada', '(604) 555-3392', '(604) 555-7293');
INSERT INTO customers VALUES ('LAZYK', 'Lazy K Kountry Store', 'John Steel', 'Marketing Manager', '12 Orchestra Terrace', 'Walla Walla', 'WA', '99362', 'USA', '(509) 555-7969', '(509) 555-6221');
INSERT INTO customers VALUES ('LEHMS', 'Lehmanns Marktstand', 'Renate Messner', 'Sales Representative', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany', '069-0245984', '069-0245874');
INSERT INTO customers VALUES ('LETSS', 'Let''s Stop N Shop', 'Jaime Yorres', 'Owner', '87 Polk St. Suite 5', 'San Francisco', 'CA', '94117', 'USA', '(415) 555-5938', NULL);
INSERT INTO customers VALUES ('LILAS', 'LILA-Supermercado', 'Carlos González', 'Accounting Manager', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela', '(9) 331-6954', '(9) 331-7256');
INSERT INTO customers VALUES ('LINOD', 'LINO-Delicateses', 'Felipe Izquierdo', 'Owner', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela', '(8) 34-56-12', '(8) 34-93-93');
INSERT INTO customers VALUES ('LONEP', 'Lonesome Pine Restaurant', 'Fran Wilson', 'Sales Manager', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA', '(503) 555-9573', '(503) 555-9646');
INSERT INTO customers VALUES ('MAGAA', 'Magazzini Alimentari Riuniti', 'Giovanni Rovelli', 'Marketing Manager', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy', '035-640230', '035-640231');
INSERT INTO customers VALUES ('MAISD', 'Maison Dewey', 'Catherine Dewey', 'Sales Agent', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium', '(02) 201 24 67', '(02) 201 24 68');
INSERT INTO customers VALUES ('MEREP', 'Mère Paillarde', 'Jean Fresnière', 'Marketing Assistant', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada', '(514) 555-8054', '(514) 555-8055');
INSERT INTO customers VALUES ('MORGK', 'Morgenstern Gesundkost', 'Alexander Feuer', 'Marketing Assistant', 'Heerstr. 22', 'Leipzig', NULL, '04179', 'Germany', '0342-023176', NULL);
INSERT INTO customers VALUES ('NORTS', 'North/South', 'Simon Crowther', 'Sales Associate', 'South House 300 Queensbridge', 'London', NULL, 'SW7 1RZ', 'UK', '(171) 555-7733', '(171) 555-2530');
INSERT INTO customers VALUES ('OCEAN', 'Océano Atlántico Ltda.', 'Yvonne Moncada', 'Sales Agent', 'Ing. Gustavo Moncada 8585 Piso 20-A', 'Buenos Aires', NULL, '1010', 'Argentina', '(1) 135-5333', '(1) 135-5535');
INSERT INTO customers VALUES ('OLDWO', 'Old World Delicatessen', 'Rene Phillips', 'Sales Representative', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA', '(907) 555-7584', '(907) 555-2880');
INSERT INTO customers VALUES ('OTTIK', 'Ottilies Käseladen', 'Henriette Pfalzheim', 'Owner', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany', '0221-0644327', '0221-0765721');
INSERT INTO customers VALUES ('PARIS', 'Paris spécialités', 'Marie Bertrand', 'Owner', '265, boulevard Charonne', 'Paris', NULL, '75012', 'France', '(1) 42.34.22.66', '(1) 42.34.22.77');
INSERT INTO customers VALUES ('PERIC', 'Pericles Comidas clásicas', 'Guillermo Fernández', 'Sales Representative', 'Calle Dr. Jorge Cash 321', 'México D.F.', NULL, '05033', 'Mexico', '(5) 552-3745', '(5) 545-3745');
INSERT INTO customers VALUES ('PICCO', 'Piccolo und mehr', 'Georg Pipps', 'Sales Manager', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria', '6562-9722', '6562-9723');
INSERT INTO customers VALUES ('PRINI', 'Princesa Isabel Vinhos', 'Isabel de Castro', 'Sales Representative', 'Estrada da saúde n. 58', 'Lisboa', NULL, '1756', 'Portugal', '(1) 356-5634', NULL);
INSERT INTO customers VALUES ('QUEDE', 'Que Delícia', 'Bernardo Batista', 'Accounting Manager', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil', '(21) 555-4252', '(21) 555-4545');
INSERT INTO customers VALUES ('QUEEN', 'Queen Cozinha', 'Lúcia Carvalho', 'Marketing Assistant', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil', '(11) 555-1189', NULL);
INSERT INTO customers VALUES ('QUICK', 'QUICK-Stop', 'Horst Kloss', 'Accounting Manager', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany', '0372-035188', NULL);
INSERT INTO customers VALUES ('RANCH', 'Rancho grande', 'Sergio Gutiérrez', 'Sales Representative', 'Av. del Libertador 900', 'Buenos Aires', NULL, '1010', 'Argentina', '(1) 123-5555', '(1) 123-5556');
INSERT INTO customers VALUES ('RATTC', 'Rattlesnake Canyon Grocery', 'Paula Wilson', 'Assistant Sales Representative', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA', '(505) 555-5939', '(505) 555-3620');
INSERT INTO customers VALUES ('REGGC', 'Reggiani Caseifici', 'Maurizio Moroni', 'Sales Associate', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy', '0522-556721', '0522-556722');
INSERT INTO customers VALUES ('RICAR', 'Ricardo Adocicados', 'Janete Limeira', 'Assistant Sales Agent', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil', '(21) 555-3412', NULL);
INSERT INTO customers VALUES ('RICSU', 'Richter Supermarkt', 'Michael Holz', 'Sales Manager', 'Grenzacherweg 237', 'Genève', NULL, '1203', 'Switzerland', '0897-034214', NULL);
INSERT INTO customers VALUES ('ROMEY', 'Romero y tomillo', 'Alejandra Camino', 'Accounting Manager', 'Gran Vía, 1', 'Madrid', NULL, '28001', 'Spain', '(91) 745 6200', '(91) 745 6210');
INSERT INTO customers VALUES ('SANTG', 'Santé Gourmet', 'Jonas Bergulfsen', 'Owner', 'Erling Skakkes gate 78', 'Stavern', NULL, '4110', 'Norway', '07-98 92 35', '07-98 92 47');
INSERT INTO customers VALUES ('SAVEA', 'Save-a-lot Markets', 'Jose Pavarotti', 'Sales Representative', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA', '(208) 555-8097', NULL);
INSERT INTO customers VALUES ('SEVES', 'Seven Seas Imports', 'Hari Kumar', 'Sales Manager', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK', '(171) 555-1717', '(171) 555-5646');
INSERT INTO customers VALUES ('SIMOB', 'Simons bistro', 'Jytte Petersen', 'Owner', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark', '31 12 34 56', '31 13 35 57');
INSERT INTO customers VALUES ('SPECD', 'Spécialités du monde', 'Dominique Perrier', 'Marketing Manager', '25, rue Lauriston', 'Paris', NULL, '75016', 'France', '(1) 47.55.60.10', '(1) 47.55.60.20');
INSERT INTO customers VALUES ('SPLIR', 'Split Rail Beer & Ale', 'Art Braunschweiger', 'Sales Manager', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA', '(307) 555-4680', '(307) 555-6525');
INSERT INTO customers VALUES ('SUPRD', 'Suprêmes délices', 'Pascale Cartrain', 'Accounting Manager', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium', '(071) 23 67 22 20', '(071) 23 67 22 21');
INSERT INTO customers VALUES ('THEBI', 'The Big Cheese', 'Liz Nixon', 'Marketing Manager', '89 Jefferson Way Suite 2', 'Portland', 'OR', '97201', 'USA', '(503) 555-3612', NULL);
INSERT INTO customers VALUES ('THECR', 'The Cracker Box', 'Liu Wong', 'Marketing Assistant', '55 Grizzly Peak Rd.', 'Butte', 'MT', '59801', 'USA', '(406) 555-5834', '(406) 555-8083');
INSERT INTO customers VALUES ('TOMSP', 'Toms Spezialitäten', 'Karin Josephs', 'Marketing Manager', 'Luisenstr. 48', 'Münster', NULL, '44087', 'Germany', '0251-031259', '0251-035695');
INSERT INTO customers VALUES ('TORTU', 'Tortuga Restaurante', 'Miguel Angel Paolino', 'Owner', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico', '(5) 555-2933', NULL);
INSERT INTO customers VALUES ('TRADH', 'Tradição Hipermercados', 'Anabela Domingues', 'Sales Representative', 'Av. Inês de Castro, 414', 'Sao Paulo', 'SP', '05634-030', 'Brazil', '(11) 555-2167', '(11) 555-2168');
INSERT INTO customers VALUES ('TRAIH', 'Trail''s Head Gourmet Provisioners', 'Helvetius Nagy', 'Sales Associate', '722 DaVinci Blvd.', 'Kirkland', 'WA', '98034', 'USA', '(206) 555-8257', '(206) 555-2174');
INSERT INTO customers VALUES ('VAFFE', 'Vaffeljernet', 'Palle Ibsen', 'Sales Manager', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark', '86 21 32 43', '86 22 33 44');
INSERT INTO customers VALUES ('VICTE', 'Victuailles en stock', 'Mary Saveley', 'Sales Agent', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France', '78.32.54.86', '78.32.54.87');
INSERT INTO customers VALUES ('VINET', 'Vins et alcools Chevalier', 'Paul Henriot', 'Accounting Manager', '59 rue de l''Abbaye', 'Reims', NULL, '51100', 'France', '26.47.15.10', '26.47.15.11');
INSERT INTO customers VALUES ('WANDK', 'Die Wandernde Kuh', 'Rita Müller', 'Sales Representative', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany', '0711-020361', '0711-035428');
INSERT INTO customers VALUES ('WARTH', 'Wartian Herkku', 'Pirkko Koskitalo', 'Accounting Manager', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland', '981-443655', '981-443655');
INSERT INTO customers VALUES ('WELLI', 'Wellington Importadora', 'Paula Parente', 'Sales Manager', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil', '(14) 555-8122', NULL);
INSERT INTO customers VALUES ('WHITC', 'White Clover Markets', 'Karl Jablonski', 'Owner', '305 - 14th Ave. S. Suite 3B', 'Seattle', 'WA', '98128', 'USA', '(206) 555-4112', '(206) 555-4115');
INSERT INTO customers VALUES ('WILMK', 'Wilman Kala', 'Matti Karttunen', 'Owner/Marketing Assistant', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland', '90-224 8858', '90-224 8858');
INSERT INTO customers VALUES ('WOLZA', 'Wolski  Zajazd', 'Zbyszek Piestrzeniewicz', 'Owner', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland', '(26) 642-7012', '(26) 642-7012');


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO employees VALUES (1, 'Davolio', 'Nancy', 'Sales Representative', 'Ms.', '1948-12-08', '1992-05-01', '507 - 20th Ave. E.\nApt. 2A', 'Seattle', 'WA', '98122', 'USA', '(206) 555-9857', '5467', '\x', 'Education includes a BA in psychology from Colorado State University in 1970.  She also completed The Art of the Cold Call.  Nancy is a member of Toastmasters International.', 2, 'http://accweb/emmployees/davolio.bmp');
INSERT INTO employees VALUES (2, 'Fuller', 'Andrew', 'Vice President, Sales', 'Dr.', '1952-02-19', '1992-08-14', '908 W. Capital Way', 'Tacoma', 'WA', '98401', 'USA', '(206) 555-9482', '3457', '\x', 'Andrew received his BTS commercial in 1974 and a Ph.D. in international marketing from the University of Dallas in 1981.  He is fluent in French and Italian and reads German.  He joined the company as a sales representative, was promoted to sales manager in January 1992 and to vice president of sales in March 1993.  Andrew is a member of the Sales Management Roundtable, the Seattle Chamber of Commerce, and the Pacific Rim Importers Association.', NULL, 'http://accweb/emmployees/fuller.bmp');
INSERT INTO employees VALUES (3, 'Leverling', 'Janet', 'Sales Representative', 'Ms.', '1963-08-30', '1992-04-01', '722 Moss Bay Blvd.', 'Kirkland', 'WA', '98033', 'USA', '(206) 555-3412', '3355', '\x', 'Janet has a BS degree in chemistry from Boston College (1984).  She has also completed a certificate program in food retailing management.  Janet was hired as a sales associate in 1991 and promoted to sales representative in February 1992.', 2, 'http://accweb/emmployees/leverling.bmp');
INSERT INTO employees VALUES (4, 'Peacock', 'Margaret', 'Sales Representative', 'Mrs.', '1937-09-19', '1993-05-03', '4110 Old Redmond Rd.', 'Redmond', 'WA', '98052', 'USA', '(206) 555-8122', '5176', '\x', 'Margaret holds a BA in English literature from Concordia College (1958) and an MA from the American Institute of Culinary Arts (1966).  She was assigned to the London office temporarily from July through November 1992.', 2, 'http://accweb/emmployees/peacock.bmp');
INSERT INTO employees VALUES (5, 'Buchanan', 'Steven', 'Sales Manager', 'Mr.', '1955-03-04', '1993-10-17', '14 Garrett Hill', 'London', NULL, 'SW1 8JR', 'UK', '(71) 555-4848', '3453', '\x', 'Steven Buchanan graduated from St. Andrews University, Scotland, with a BSC degree in 1976.  Upon joining the company as a sales representative in 1992, he spent 6 months in an orientation program at the Seattle office and then returned to his permanent post in London.  He was promoted to sales manager in March 1993.  Mr. Buchanan has completed the courses Successful Telemarketing and International Sales Management.  He is fluent in French.', 2, 'http://accweb/emmployees/buchanan.bmp');
INSERT INTO employees VALUES (6, 'Suyama', 'Michael', 'Sales Representative', 'Mr.', '1963-07-02', '1993-10-17', 'Coventry House\nMiner Rd.', 'London', NULL, 'EC2 7JR', 'UK', '(71) 555-7773', '428', '\x', 'Michael is a graduate of Sussex University (MA, economics, 1983) and the University of California at Los Angeles (MBA, marketing, 1986).  He has also taken the courses Multi-Cultural Selling and Time Management for the Sales Professional.  He is fluent in Japanese and can read and write French, Portuguese, and Spanish.', 5, 'http://accweb/emmployees/davolio.bmp');
INSERT INTO employees VALUES (7, 'King', 'Robert', 'Sales Representative', 'Mr.', '1960-05-29', '1994-01-02', 'Edgeham Hollow\nWinchester Way', 'London', NULL, 'RG1 9SP', 'UK', '(71) 555-5598', '465', '\x', 'Robert King served in the Peace Corps and traveled extensively before completing his degree in English at the University of Michigan in 1992, the year he joined the company.  After completing a course entitled Selling in Europe, he was transferred to the London office in March 1993.', 5, 'http://accweb/emmployees/davolio.bmp');
INSERT INTO employees VALUES (8, 'Callahan', 'Laura', 'Inside Sales Coordinator', 'Ms.', '1958-01-09', '1994-03-05', '4726 - 11th Ave. N.E.', 'Seattle', 'WA', '98105', 'USA', '(206) 555-1189', '2344', '\x', 'Laura received a BA in psychology from the University of Washington.  She has also completed a course in business French.  She reads and writes French.', 2, 'http://accweb/emmployees/davolio.bmp');
INSERT INTO employees VALUES (9, 'Dodsworth', 'Anne', 'Sales Representative', 'Ms.', '1966-01-27', '1994-11-15', '7 Houndstooth Rd.', 'London', NULL, 'WG2 7LT', 'UK', '(71) 555-4444', '452', '\x', 'Anne has a BA degree in English from St. Lawrence College.  She is fluent in French and German.', 5, 'http://accweb/emmployees/davolio.bmp');


--
-- Data for Name: employee_territories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO employee_territories VALUES (1, '06897');
INSERT INTO employee_territories VALUES (1, '19713');
INSERT INTO employee_territories VALUES (2, '01581');
INSERT INTO employee_territories VALUES (2, '01730');
INSERT INTO employee_territories VALUES (2, '01833');
INSERT INTO employee_territories VALUES (2, '02116');
INSERT INTO employee_territories VALUES (2, '02139');
INSERT INTO employee_territories VALUES (2, '02184');
INSERT INTO employee_territories VALUES (2, '40222');
INSERT INTO employee_territories VALUES (3, '30346');
INSERT INTO employee_territories VALUES (3, '31406');
INSERT INTO employee_territories VALUES (3, '32859');
INSERT INTO employee_territories VALUES (3, '33607');
INSERT INTO employee_territories VALUES (4, '20852');
INSERT INTO employee_territories VALUES (4, '27403');
INSERT INTO employee_territories VALUES (4, '27511');
INSERT INTO employee_territories VALUES (5, '02903');
INSERT INTO employee_territories VALUES (5, '07960');
INSERT INTO employee_territories VALUES (5, '08837');
INSERT INTO employee_territories VALUES (5, '10019');
INSERT INTO employee_territories VALUES (5, '10038');
INSERT INTO employee_territories VALUES (5, '11747');
INSERT INTO employee_territories VALUES (5, '14450');
INSERT INTO employee_territories VALUES (6, '85014');
INSERT INTO employee_territories VALUES (6, '85251');
INSERT INTO employee_territories VALUES (6, '98004');
INSERT INTO employee_territories VALUES (6, '98052');
INSERT INTO employee_territories VALUES (6, '98104');
INSERT INTO employee_territories VALUES (7, '60179');
INSERT INTO employee_territories VALUES (7, '60601');
INSERT INTO employee_territories VALUES (7, '80202');
INSERT INTO employee_territories VALUES (7, '80909');
INSERT INTO employee_territories VALUES (7, '90405');
INSERT INTO employee_territories VALUES (7, '94025');
INSERT INTO employee_territories VALUES (7, '94105');
INSERT INTO employee_territories VALUES (7, '95008');
INSERT INTO employee_territories VALUES (7, '95054');
INSERT INTO employee_territories VALUES (7, '95060');
INSERT INTO employee_territories VALUES (8, '19428');
INSERT INTO employee_territories VALUES (8, '44122');
INSERT INTO employee_territories VALUES (8, '45839');
INSERT INTO employee_territories VALUES (8, '53404');
INSERT INTO employee_territories VALUES (9, '03049');
INSERT INTO employee_territories VALUES (9, '03801');
INSERT INTO employee_territories VALUES (9, '48075');
INSERT INTO employee_territories VALUES (9, '48084');
INSERT INTO employee_territories VALUES (9, '48304');
INSERT INTO employee_territories VALUES (9, '55113');
INSERT INTO employee_territories VALUES (9, '55439');


--
-- Data for Name: order_details; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO order_details VALUES (10248, 11, 14, 12, 0);
INSERT INTO order_details VALUES (10248, 42, 9.80000019, 10, 0);
INSERT INTO order_details VALUES (10248, 72, 34.7999992, 5, 0);
INSERT INTO order_details VALUES (10249, 14, 18.6000004, 9, 0);
INSERT INTO order_details VALUES (10249, 51, 42.4000015, 40, 0);
INSERT INTO order_details VALUES (10250, 41, 7.69999981, 10, 0);
INSERT INTO order_details VALUES (10250, 51, 42.4000015, 35, 0.150000006);
INSERT INTO order_details VALUES (10250, 65, 16.7999992, 15, 0.150000006);
INSERT INTO order_details VALUES (10251, 22, 16.7999992, 6, 0.0500000007);
INSERT INTO order_details VALUES (10251, 57, 15.6000004, 15, 0.0500000007);
INSERT INTO order_details VALUES (10251, 65, 16.7999992, 20, 0);
INSERT INTO order_details VALUES (10252, 20, 64.8000031, 40, 0.0500000007);
INSERT INTO order_details VALUES (10252, 33, 2, 25, 0.0500000007);
INSERT INTO order_details VALUES (10252, 60, 27.2000008, 40, 0);
INSERT INTO order_details VALUES (10253, 31, 10, 20, 0);
INSERT INTO order_details VALUES (10253, 39, 14.3999996, 42, 0);
INSERT INTO order_details VALUES (10253, 49, 16, 40, 0);
INSERT INTO order_details VALUES (10254, 24, 3.5999999, 15, 0.150000006);
INSERT INTO order_details VALUES (10254, 55, 19.2000008, 21, 0.150000006);
INSERT INTO order_details VALUES (10254, 74, 8, 21, 0);
INSERT INTO order_details VALUES (10255, 2, 15.1999998, 20, 0);
INSERT INTO order_details VALUES (10255, 16, 13.8999996, 35, 0);
INSERT INTO order_details VALUES (10255, 36, 15.1999998, 25, 0);
INSERT INTO order_details VALUES (10255, 59, 44, 30, 0);
INSERT INTO order_details VALUES (10256, 53, 26.2000008, 15, 0);
INSERT INTO order_details VALUES (10256, 77, 10.3999996, 12, 0);
INSERT INTO order_details VALUES (10257, 27, 35.0999985, 25, 0);
INSERT INTO order_details VALUES (10257, 39, 14.3999996, 6, 0);
INSERT INTO order_details VALUES (10257, 77, 10.3999996, 15, 0);
INSERT INTO order_details VALUES (10258, 2, 15.1999998, 50, 0.200000003);
INSERT INTO order_details VALUES (10258, 5, 17, 65, 0.200000003);
INSERT INTO order_details VALUES (10258, 32, 25.6000004, 6, 0.200000003);
INSERT INTO order_details VALUES (10259, 21, 8, 10, 0);
INSERT INTO order_details VALUES (10259, 37, 20.7999992, 1, 0);
INSERT INTO order_details VALUES (10260, 41, 7.69999981, 16, 0.25);
INSERT INTO order_details VALUES (10260, 57, 15.6000004, 50, 0);
INSERT INTO order_details VALUES (10260, 62, 39.4000015, 15, 0.25);
INSERT INTO order_details VALUES (10260, 70, 12, 21, 0.25);
INSERT INTO order_details VALUES (10261, 21, 8, 20, 0);
INSERT INTO order_details VALUES (10261, 35, 14.3999996, 20, 0);
INSERT INTO order_details VALUES (10262, 5, 17, 12, 0.200000003);
INSERT INTO order_details VALUES (10262, 7, 24, 15, 0);
INSERT INTO order_details VALUES (10262, 56, 30.3999996, 2, 0);
INSERT INTO order_details VALUES (10263, 16, 13.8999996, 60, 0.25);
INSERT INTO order_details VALUES (10263, 24, 3.5999999, 28, 0);
INSERT INTO order_details VALUES (10263, 30, 20.7000008, 60, 0.25);
INSERT INTO order_details VALUES (10263, 74, 8, 36, 0.25);
INSERT INTO order_details VALUES (10264, 2, 15.1999998, 35, 0);
INSERT INTO order_details VALUES (10264, 41, 7.69999981, 25, 0.150000006);
INSERT INTO order_details VALUES (10265, 17, 31.2000008, 30, 0);
INSERT INTO order_details VALUES (10265, 70, 12, 20, 0);
INSERT INTO order_details VALUES (10266, 12, 30.3999996, 12, 0.0500000007);
INSERT INTO order_details VALUES (10267, 40, 14.6999998, 50, 0);
INSERT INTO order_details VALUES (10267, 59, 44, 70, 0.150000006);
INSERT INTO order_details VALUES (10267, 76, 14.3999996, 15, 0.150000006);
INSERT INTO order_details VALUES (10268, 29, 99, 10, 0);
INSERT INTO order_details VALUES (10268, 72, 27.7999992, 4, 0);
INSERT INTO order_details VALUES (10269, 33, 2, 60, 0.0500000007);
INSERT INTO order_details VALUES (10269, 72, 27.7999992, 20, 0.0500000007);
INSERT INTO order_details VALUES (10270, 36, 15.1999998, 30, 0);
INSERT INTO order_details VALUES (10270, 43, 36.7999992, 25, 0);
INSERT INTO order_details VALUES (10271, 33, 2, 24, 0);
INSERT INTO order_details VALUES (10272, 20, 64.8000031, 6, 0);
INSERT INTO order_details VALUES (10272, 31, 10, 40, 0);
INSERT INTO order_details VALUES (10272, 72, 27.7999992, 24, 0);
INSERT INTO order_details VALUES (10273, 10, 24.7999992, 24, 0.0500000007);
INSERT INTO order_details VALUES (10273, 31, 10, 15, 0.0500000007);
INSERT INTO order_details VALUES (10273, 33, 2, 20, 0);
INSERT INTO order_details VALUES (10273, 40, 14.6999998, 60, 0.0500000007);
INSERT INTO order_details VALUES (10273, 76, 14.3999996, 33, 0.0500000007);
INSERT INTO order_details VALUES (10274, 71, 17.2000008, 20, 0);
INSERT INTO order_details VALUES (10274, 72, 27.7999992, 7, 0);
INSERT INTO order_details VALUES (10275, 24, 3.5999999, 12, 0.0500000007);
INSERT INTO order_details VALUES (10275, 59, 44, 6, 0.0500000007);
INSERT INTO order_details VALUES (10276, 10, 24.7999992, 15, 0);
INSERT INTO order_details VALUES (10276, 13, 4.80000019, 10, 0);
INSERT INTO order_details VALUES (10277, 28, 36.4000015, 20, 0);
INSERT INTO order_details VALUES (10277, 62, 39.4000015, 12, 0);
INSERT INTO order_details VALUES (10278, 44, 15.5, 16, 0);
INSERT INTO order_details VALUES (10278, 59, 44, 15, 0);
INSERT INTO order_details VALUES (10278, 63, 35.0999985, 8, 0);
INSERT INTO order_details VALUES (10278, 73, 12, 25, 0);
INSERT INTO order_details VALUES (10279, 17, 31.2000008, 15, 0.25);
INSERT INTO order_details VALUES (10280, 24, 3.5999999, 12, 0);
INSERT INTO order_details VALUES (10280, 55, 19.2000008, 20, 0);
INSERT INTO order_details VALUES (10280, 75, 6.19999981, 30, 0);
INSERT INTO order_details VALUES (10281, 19, 7.30000019, 1, 0);
INSERT INTO order_details VALUES (10281, 24, 3.5999999, 6, 0);
INSERT INTO order_details VALUES (10281, 35, 14.3999996, 4, 0);
INSERT INTO order_details VALUES (10282, 30, 20.7000008, 6, 0);
INSERT INTO order_details VALUES (10282, 57, 15.6000004, 2, 0);
INSERT INTO order_details VALUES (10283, 15, 12.3999996, 20, 0);
INSERT INTO order_details VALUES (10283, 19, 7.30000019, 18, 0);
INSERT INTO order_details VALUES (10283, 60, 27.2000008, 35, 0);
INSERT INTO order_details VALUES (10283, 72, 27.7999992, 3, 0);
INSERT INTO order_details VALUES (10284, 27, 35.0999985, 15, 0.25);
INSERT INTO order_details VALUES (10284, 44, 15.5, 21, 0);
INSERT INTO order_details VALUES (10284, 60, 27.2000008, 20, 0.25);
INSERT INTO order_details VALUES (10284, 67, 11.1999998, 5, 0.25);
INSERT INTO order_details VALUES (10285, 1, 14.3999996, 45, 0.200000003);
INSERT INTO order_details VALUES (10285, 40, 14.6999998, 40, 0.200000003);
INSERT INTO order_details VALUES (10285, 53, 26.2000008, 36, 0.200000003);
INSERT INTO order_details VALUES (10286, 35, 14.3999996, 100, 0);
INSERT INTO order_details VALUES (10286, 62, 39.4000015, 40, 0);
INSERT INTO order_details VALUES (10287, 16, 13.8999996, 40, 0.150000006);
INSERT INTO order_details VALUES (10287, 34, 11.1999998, 20, 0);
INSERT INTO order_details VALUES (10287, 46, 9.60000038, 15, 0.150000006);
INSERT INTO order_details VALUES (10288, 54, 5.9000001, 10, 0.100000001);
INSERT INTO order_details VALUES (10288, 68, 10, 3, 0.100000001);
INSERT INTO order_details VALUES (10289, 3, 8, 30, 0);
INSERT INTO order_details VALUES (10289, 64, 26.6000004, 9, 0);
INSERT INTO order_details VALUES (10290, 5, 17, 20, 0);
INSERT INTO order_details VALUES (10290, 29, 99, 15, 0);
INSERT INTO order_details VALUES (10290, 49, 16, 15, 0);
INSERT INTO order_details VALUES (10290, 77, 10.3999996, 10, 0);
INSERT INTO order_details VALUES (10291, 13, 4.80000019, 20, 0.100000001);
INSERT INTO order_details VALUES (10291, 44, 15.5, 24, 0.100000001);
INSERT INTO order_details VALUES (10291, 51, 42.4000015, 2, 0.100000001);
INSERT INTO order_details VALUES (10292, 20, 64.8000031, 20, 0);
INSERT INTO order_details VALUES (10293, 18, 50, 12, 0);
INSERT INTO order_details VALUES (10293, 24, 3.5999999, 10, 0);
INSERT INTO order_details VALUES (10293, 63, 35.0999985, 5, 0);
INSERT INTO order_details VALUES (10293, 75, 6.19999981, 6, 0);
INSERT INTO order_details VALUES (10294, 1, 14.3999996, 18, 0);
INSERT INTO order_details VALUES (10294, 17, 31.2000008, 15, 0);
INSERT INTO order_details VALUES (10294, 43, 36.7999992, 15, 0);
INSERT INTO order_details VALUES (10294, 60, 27.2000008, 21, 0);
INSERT INTO order_details VALUES (10294, 75, 6.19999981, 6, 0);
INSERT INTO order_details VALUES (10295, 56, 30.3999996, 4, 0);
INSERT INTO order_details VALUES (10296, 11, 16.7999992, 12, 0);
INSERT INTO order_details VALUES (10296, 16, 13.8999996, 30, 0);
INSERT INTO order_details VALUES (10296, 69, 28.7999992, 15, 0);
INSERT INTO order_details VALUES (10297, 39, 14.3999996, 60, 0);
INSERT INTO order_details VALUES (10297, 72, 27.7999992, 20, 0);
INSERT INTO order_details VALUES (10298, 2, 15.1999998, 40, 0);
INSERT INTO order_details VALUES (10298, 36, 15.1999998, 40, 0.25);
INSERT INTO order_details VALUES (10298, 59, 44, 30, 0.25);
INSERT INTO order_details VALUES (10298, 62, 39.4000015, 15, 0);
INSERT INTO order_details VALUES (10299, 19, 7.30000019, 15, 0);
INSERT INTO order_details VALUES (10299, 70, 12, 20, 0);
INSERT INTO order_details VALUES (10300, 66, 13.6000004, 30, 0);
INSERT INTO order_details VALUES (10300, 68, 10, 20, 0);
INSERT INTO order_details VALUES (10301, 40, 14.6999998, 10, 0);
INSERT INTO order_details VALUES (10301, 56, 30.3999996, 20, 0);
INSERT INTO order_details VALUES (10302, 17, 31.2000008, 40, 0);
INSERT INTO order_details VALUES (10302, 28, 36.4000015, 28, 0);
INSERT INTO order_details VALUES (10302, 43, 36.7999992, 12, 0);
INSERT INTO order_details VALUES (10303, 40, 14.6999998, 40, 0.100000001);
INSERT INTO order_details VALUES (10303, 65, 16.7999992, 30, 0.100000001);
INSERT INTO order_details VALUES (10303, 68, 10, 15, 0.100000001);
INSERT INTO order_details VALUES (10304, 49, 16, 30, 0);
INSERT INTO order_details VALUES (10304, 59, 44, 10, 0);
INSERT INTO order_details VALUES (10304, 71, 17.2000008, 2, 0);
INSERT INTO order_details VALUES (10305, 18, 50, 25, 0.100000001);
INSERT INTO order_details VALUES (10305, 29, 99, 25, 0.100000001);
INSERT INTO order_details VALUES (10305, 39, 14.3999996, 30, 0.100000001);
INSERT INTO order_details VALUES (10306, 30, 20.7000008, 10, 0);
INSERT INTO order_details VALUES (10306, 53, 26.2000008, 10, 0);
INSERT INTO order_details VALUES (10306, 54, 5.9000001, 5, 0);
INSERT INTO order_details VALUES (10307, 62, 39.4000015, 10, 0);
INSERT INTO order_details VALUES (10307, 68, 10, 3, 0);
INSERT INTO order_details VALUES (10308, 69, 28.7999992, 1, 0);
INSERT INTO order_details VALUES (10308, 70, 12, 5, 0);
INSERT INTO order_details VALUES (10309, 4, 17.6000004, 20, 0);
INSERT INTO order_details VALUES (10309, 6, 20, 30, 0);
INSERT INTO order_details VALUES (10309, 42, 11.1999998, 2, 0);
INSERT INTO order_details VALUES (10309, 43, 36.7999992, 20, 0);
INSERT INTO order_details VALUES (10309, 71, 17.2000008, 3, 0);
INSERT INTO order_details VALUES (10310, 16, 13.8999996, 10, 0);
INSERT INTO order_details VALUES (10310, 62, 39.4000015, 5, 0);
INSERT INTO order_details VALUES (10311, 42, 11.1999998, 6, 0);
INSERT INTO order_details VALUES (10311, 69, 28.7999992, 7, 0);
INSERT INTO order_details VALUES (10312, 28, 36.4000015, 4, 0);
INSERT INTO order_details VALUES (10312, 43, 36.7999992, 24, 0);
INSERT INTO order_details VALUES (10312, 53, 26.2000008, 20, 0);
INSERT INTO order_details VALUES (10312, 75, 6.19999981, 10, 0);
INSERT INTO order_details VALUES (10313, 36, 15.1999998, 12, 0);
INSERT INTO order_details VALUES (10314, 32, 25.6000004, 40, 0.100000001);
INSERT INTO order_details VALUES (10314, 58, 10.6000004, 30, 0.100000001);
INSERT INTO order_details VALUES (10314, 62, 39.4000015, 25, 0.100000001);
INSERT INTO order_details VALUES (10315, 34, 11.1999998, 14, 0);
INSERT INTO order_details VALUES (10315, 70, 12, 30, 0);
INSERT INTO order_details VALUES (10316, 41, 7.69999981, 10, 0);
INSERT INTO order_details VALUES (10316, 62, 39.4000015, 70, 0);
INSERT INTO order_details VALUES (10317, 1, 14.3999996, 20, 0);
INSERT INTO order_details VALUES (10318, 41, 7.69999981, 20, 0);
INSERT INTO order_details VALUES (10318, 76, 14.3999996, 6, 0);
INSERT INTO order_details VALUES (10319, 17, 31.2000008, 8, 0);
INSERT INTO order_details VALUES (10319, 28, 36.4000015, 14, 0);
INSERT INTO order_details VALUES (10319, 76, 14.3999996, 30, 0);
INSERT INTO order_details VALUES (10320, 71, 17.2000008, 30, 0);
INSERT INTO order_details VALUES (10321, 35, 14.3999996, 10, 0);
INSERT INTO order_details VALUES (10322, 52, 5.5999999, 20, 0);
INSERT INTO order_details VALUES (10323, 15, 12.3999996, 5, 0);
INSERT INTO order_details VALUES (10323, 25, 11.1999998, 4, 0);
INSERT INTO order_details VALUES (10323, 39, 14.3999996, 4, 0);
INSERT INTO order_details VALUES (10324, 16, 13.8999996, 21, 0.150000006);
INSERT INTO order_details VALUES (10324, 35, 14.3999996, 70, 0.150000006);
INSERT INTO order_details VALUES (10324, 46, 9.60000038, 30, 0);
INSERT INTO order_details VALUES (10324, 59, 44, 40, 0.150000006);
INSERT INTO order_details VALUES (10324, 63, 35.0999985, 80, 0.150000006);
INSERT INTO order_details VALUES (10325, 6, 20, 6, 0);
INSERT INTO order_details VALUES (10325, 13, 4.80000019, 12, 0);
INSERT INTO order_details VALUES (10325, 14, 18.6000004, 9, 0);
INSERT INTO order_details VALUES (10325, 31, 10, 4, 0);
INSERT INTO order_details VALUES (10325, 72, 27.7999992, 40, 0);
INSERT INTO order_details VALUES (10326, 4, 17.6000004, 24, 0);
INSERT INTO order_details VALUES (10326, 57, 15.6000004, 16, 0);
INSERT INTO order_details VALUES (10326, 75, 6.19999981, 50, 0);
INSERT INTO order_details VALUES (10327, 2, 15.1999998, 25, 0.200000003);
INSERT INTO order_details VALUES (10327, 11, 16.7999992, 50, 0.200000003);
INSERT INTO order_details VALUES (10327, 30, 20.7000008, 35, 0.200000003);
INSERT INTO order_details VALUES (10327, 58, 10.6000004, 30, 0.200000003);
INSERT INTO order_details VALUES (10328, 59, 44, 9, 0);
INSERT INTO order_details VALUES (10328, 65, 16.7999992, 40, 0);
INSERT INTO order_details VALUES (10328, 68, 10, 10, 0);
INSERT INTO order_details VALUES (10329, 19, 7.30000019, 10, 0.0500000007);
INSERT INTO order_details VALUES (10329, 30, 20.7000008, 8, 0.0500000007);
INSERT INTO order_details VALUES (10329, 38, 210.800003, 20, 0.0500000007);
INSERT INTO order_details VALUES (10329, 56, 30.3999996, 12, 0.0500000007);
INSERT INTO order_details VALUES (10330, 26, 24.8999996, 50, 0.150000006);
INSERT INTO order_details VALUES (10330, 72, 27.7999992, 25, 0.150000006);
INSERT INTO order_details VALUES (10331, 54, 5.9000001, 15, 0);
INSERT INTO order_details VALUES (10332, 18, 50, 40, 0.200000003);
INSERT INTO order_details VALUES (10332, 42, 11.1999998, 10, 0.200000003);
INSERT INTO order_details VALUES (10332, 47, 7.5999999, 16, 0.200000003);
INSERT INTO order_details VALUES (10333, 14, 18.6000004, 10, 0);
INSERT INTO order_details VALUES (10333, 21, 8, 10, 0.100000001);
INSERT INTO order_details VALUES (10333, 71, 17.2000008, 40, 0.100000001);
INSERT INTO order_details VALUES (10334, 52, 5.5999999, 8, 0);
INSERT INTO order_details VALUES (10334, 68, 10, 10, 0);
INSERT INTO order_details VALUES (10335, 2, 15.1999998, 7, 0.200000003);
INSERT INTO order_details VALUES (10335, 31, 10, 25, 0.200000003);
INSERT INTO order_details VALUES (10335, 32, 25.6000004, 6, 0.200000003);
INSERT INTO order_details VALUES (10335, 51, 42.4000015, 48, 0.200000003);
INSERT INTO order_details VALUES (10336, 4, 17.6000004, 18, 0.100000001);
INSERT INTO order_details VALUES (10337, 23, 7.19999981, 40, 0);
INSERT INTO order_details VALUES (10337, 26, 24.8999996, 24, 0);
INSERT INTO order_details VALUES (10337, 36, 15.1999998, 20, 0);
INSERT INTO order_details VALUES (10337, 37, 20.7999992, 28, 0);
INSERT INTO order_details VALUES (10337, 72, 27.7999992, 25, 0);
INSERT INTO order_details VALUES (10338, 17, 31.2000008, 20, 0);
INSERT INTO order_details VALUES (10338, 30, 20.7000008, 15, 0);
INSERT INTO order_details VALUES (10339, 4, 17.6000004, 10, 0);
INSERT INTO order_details VALUES (10339, 17, 31.2000008, 70, 0.0500000007);
INSERT INTO order_details VALUES (10339, 62, 39.4000015, 28, 0);
INSERT INTO order_details VALUES (10340, 18, 50, 20, 0.0500000007);
INSERT INTO order_details VALUES (10340, 41, 7.69999981, 12, 0.0500000007);
INSERT INTO order_details VALUES (10340, 43, 36.7999992, 40, 0.0500000007);
INSERT INTO order_details VALUES (10341, 33, 2, 8, 0);
INSERT INTO order_details VALUES (10341, 59, 44, 9, 0.150000006);
INSERT INTO order_details VALUES (10342, 2, 15.1999998, 24, 0.200000003);
INSERT INTO order_details VALUES (10342, 31, 10, 56, 0.200000003);
INSERT INTO order_details VALUES (10342, 36, 15.1999998, 40, 0.200000003);
INSERT INTO order_details VALUES (10342, 55, 19.2000008, 40, 0.200000003);
INSERT INTO order_details VALUES (10343, 64, 26.6000004, 50, 0);
INSERT INTO order_details VALUES (10343, 68, 10, 4, 0.0500000007);
INSERT INTO order_details VALUES (10343, 76, 14.3999996, 15, 0);
INSERT INTO order_details VALUES (10344, 4, 17.6000004, 35, 0);
INSERT INTO order_details VALUES (10344, 8, 32, 70, 0.25);
INSERT INTO order_details VALUES (10345, 8, 32, 70, 0);
INSERT INTO order_details VALUES (10345, 19, 7.30000019, 80, 0);
INSERT INTO order_details VALUES (10345, 42, 11.1999998, 9, 0);
INSERT INTO order_details VALUES (10346, 17, 31.2000008, 36, 0.100000001);
INSERT INTO order_details VALUES (10346, 56, 30.3999996, 20, 0);
INSERT INTO order_details VALUES (10347, 25, 11.1999998, 10, 0);
INSERT INTO order_details VALUES (10347, 39, 14.3999996, 50, 0.150000006);
INSERT INTO order_details VALUES (10347, 40, 14.6999998, 4, 0);
INSERT INTO order_details VALUES (10347, 75, 6.19999981, 6, 0.150000006);
INSERT INTO order_details VALUES (10348, 1, 14.3999996, 15, 0.150000006);
INSERT INTO order_details VALUES (10348, 23, 7.19999981, 25, 0);
INSERT INTO order_details VALUES (10349, 54, 5.9000001, 24, 0);
INSERT INTO order_details VALUES (10350, 50, 13, 15, 0.100000001);
INSERT INTO order_details VALUES (10350, 69, 28.7999992, 18, 0.100000001);
INSERT INTO order_details VALUES (10351, 38, 210.800003, 20, 0.0500000007);
INSERT INTO order_details VALUES (10351, 41, 7.69999981, 13, 0);
INSERT INTO order_details VALUES (10351, 44, 15.5, 77, 0.0500000007);
INSERT INTO order_details VALUES (10351, 65, 16.7999992, 10, 0.0500000007);
INSERT INTO order_details VALUES (10352, 24, 3.5999999, 10, 0);
INSERT INTO order_details VALUES (10352, 54, 5.9000001, 20, 0.150000006);
INSERT INTO order_details VALUES (10353, 11, 16.7999992, 12, 0.200000003);
INSERT INTO order_details VALUES (10353, 38, 210.800003, 50, 0.200000003);
INSERT INTO order_details VALUES (10354, 1, 14.3999996, 12, 0);
INSERT INTO order_details VALUES (10354, 29, 99, 4, 0);
INSERT INTO order_details VALUES (10355, 24, 3.5999999, 25, 0);
INSERT INTO order_details VALUES (10355, 57, 15.6000004, 25, 0);
INSERT INTO order_details VALUES (10356, 31, 10, 30, 0);
INSERT INTO order_details VALUES (10356, 55, 19.2000008, 12, 0);
INSERT INTO order_details VALUES (10356, 69, 28.7999992, 20, 0);
INSERT INTO order_details VALUES (10357, 10, 24.7999992, 30, 0.200000003);
INSERT INTO order_details VALUES (10357, 26, 24.8999996, 16, 0);
INSERT INTO order_details VALUES (10357, 60, 27.2000008, 8, 0.200000003);
INSERT INTO order_details VALUES (10358, 24, 3.5999999, 10, 0.0500000007);
INSERT INTO order_details VALUES (10358, 34, 11.1999998, 10, 0.0500000007);
INSERT INTO order_details VALUES (10358, 36, 15.1999998, 20, 0.0500000007);
INSERT INTO order_details VALUES (10359, 16, 13.8999996, 56, 0.0500000007);
INSERT INTO order_details VALUES (10359, 31, 10, 70, 0.0500000007);
INSERT INTO order_details VALUES (10359, 60, 27.2000008, 80, 0.0500000007);
INSERT INTO order_details VALUES (10360, 28, 36.4000015, 30, 0);
INSERT INTO order_details VALUES (10360, 29, 99, 35, 0);
INSERT INTO order_details VALUES (10360, 38, 210.800003, 10, 0);
INSERT INTO order_details VALUES (10360, 49, 16, 35, 0);
INSERT INTO order_details VALUES (10360, 54, 5.9000001, 28, 0);
INSERT INTO order_details VALUES (10361, 39, 14.3999996, 54, 0.100000001);
INSERT INTO order_details VALUES (10361, 60, 27.2000008, 55, 0.100000001);
INSERT INTO order_details VALUES (10362, 25, 11.1999998, 50, 0);
INSERT INTO order_details VALUES (10362, 51, 42.4000015, 20, 0);
INSERT INTO order_details VALUES (10362, 54, 5.9000001, 24, 0);
INSERT INTO order_details VALUES (10363, 31, 10, 20, 0);
INSERT INTO order_details VALUES (10363, 75, 6.19999981, 12, 0);
INSERT INTO order_details VALUES (10363, 76, 14.3999996, 12, 0);
INSERT INTO order_details VALUES (10364, 69, 28.7999992, 30, 0);
INSERT INTO order_details VALUES (10364, 71, 17.2000008, 5, 0);
INSERT INTO order_details VALUES (10365, 11, 16.7999992, 24, 0);
INSERT INTO order_details VALUES (10366, 65, 16.7999992, 5, 0);
INSERT INTO order_details VALUES (10366, 77, 10.3999996, 5, 0);
INSERT INTO order_details VALUES (10367, 34, 11.1999998, 36, 0);
INSERT INTO order_details VALUES (10367, 54, 5.9000001, 18, 0);
INSERT INTO order_details VALUES (10367, 65, 16.7999992, 15, 0);
INSERT INTO order_details VALUES (10367, 77, 10.3999996, 7, 0);
INSERT INTO order_details VALUES (10368, 21, 8, 5, 0.100000001);
INSERT INTO order_details VALUES (10368, 28, 36.4000015, 13, 0.100000001);
INSERT INTO order_details VALUES (10368, 57, 15.6000004, 25, 0);
INSERT INTO order_details VALUES (10368, 64, 26.6000004, 35, 0.100000001);
INSERT INTO order_details VALUES (10369, 29, 99, 20, 0);
INSERT INTO order_details VALUES (10369, 56, 30.3999996, 18, 0.25);
INSERT INTO order_details VALUES (10370, 1, 14.3999996, 15, 0.150000006);
INSERT INTO order_details VALUES (10370, 64, 26.6000004, 30, 0);
INSERT INTO order_details VALUES (10370, 74, 8, 20, 0.150000006);
INSERT INTO order_details VALUES (10371, 36, 15.1999998, 6, 0.200000003);
INSERT INTO order_details VALUES (10372, 20, 64.8000031, 12, 0.25);
INSERT INTO order_details VALUES (10372, 38, 210.800003, 40, 0.25);
INSERT INTO order_details VALUES (10372, 60, 27.2000008, 70, 0.25);
INSERT INTO order_details VALUES (10372, 72, 27.7999992, 42, 0.25);
INSERT INTO order_details VALUES (10373, 58, 10.6000004, 80, 0.200000003);
INSERT INTO order_details VALUES (10373, 71, 17.2000008, 50, 0.200000003);
INSERT INTO order_details VALUES (10374, 31, 10, 30, 0);
INSERT INTO order_details VALUES (10374, 58, 10.6000004, 15, 0);
INSERT INTO order_details VALUES (10375, 14, 18.6000004, 15, 0);
INSERT INTO order_details VALUES (10375, 54, 5.9000001, 10, 0);
INSERT INTO order_details VALUES (10376, 31, 10, 42, 0.0500000007);
INSERT INTO order_details VALUES (10377, 28, 36.4000015, 20, 0.150000006);
INSERT INTO order_details VALUES (10377, 39, 14.3999996, 20, 0.150000006);
INSERT INTO order_details VALUES (10378, 71, 17.2000008, 6, 0);
INSERT INTO order_details VALUES (10379, 41, 7.69999981, 8, 0.100000001);
INSERT INTO order_details VALUES (10379, 63, 35.0999985, 16, 0.100000001);
INSERT INTO order_details VALUES (10379, 65, 16.7999992, 20, 0.100000001);
INSERT INTO order_details VALUES (10380, 30, 20.7000008, 18, 0.100000001);
INSERT INTO order_details VALUES (10380, 53, 26.2000008, 20, 0.100000001);
INSERT INTO order_details VALUES (10380, 60, 27.2000008, 6, 0.100000001);
INSERT INTO order_details VALUES (10380, 70, 12, 30, 0);
INSERT INTO order_details VALUES (10381, 74, 8, 14, 0);
INSERT INTO order_details VALUES (10382, 5, 17, 32, 0);
INSERT INTO order_details VALUES (10382, 18, 50, 9, 0);
INSERT INTO order_details VALUES (10382, 29, 99, 14, 0);
INSERT INTO order_details VALUES (10382, 33, 2, 60, 0);
INSERT INTO order_details VALUES (10382, 74, 8, 50, 0);
INSERT INTO order_details VALUES (10383, 13, 4.80000019, 20, 0);
INSERT INTO order_details VALUES (10383, 50, 13, 15, 0);
INSERT INTO order_details VALUES (10383, 56, 30.3999996, 20, 0);
INSERT INTO order_details VALUES (10384, 20, 64.8000031, 28, 0);
INSERT INTO order_details VALUES (10384, 60, 27.2000008, 15, 0);
INSERT INTO order_details VALUES (10385, 7, 24, 10, 0.200000003);
INSERT INTO order_details VALUES (10385, 60, 27.2000008, 20, 0.200000003);
INSERT INTO order_details VALUES (10385, 68, 10, 8, 0.200000003);
INSERT INTO order_details VALUES (10386, 24, 3.5999999, 15, 0);
INSERT INTO order_details VALUES (10386, 34, 11.1999998, 10, 0);
INSERT INTO order_details VALUES (10387, 24, 3.5999999, 15, 0);
INSERT INTO order_details VALUES (10387, 28, 36.4000015, 6, 0);
INSERT INTO order_details VALUES (10387, 59, 44, 12, 0);
INSERT INTO order_details VALUES (10387, 71, 17.2000008, 15, 0);
INSERT INTO order_details VALUES (10388, 45, 7.5999999, 15, 0.200000003);
INSERT INTO order_details VALUES (10388, 52, 5.5999999, 20, 0.200000003);
INSERT INTO order_details VALUES (10388, 53, 26.2000008, 40, 0);
INSERT INTO order_details VALUES (10389, 10, 24.7999992, 16, 0);
INSERT INTO order_details VALUES (10389, 55, 19.2000008, 15, 0);
INSERT INTO order_details VALUES (10389, 62, 39.4000015, 20, 0);
INSERT INTO order_details VALUES (10389, 70, 12, 30, 0);
INSERT INTO order_details VALUES (10390, 31, 10, 60, 0.100000001);
INSERT INTO order_details VALUES (10390, 35, 14.3999996, 40, 0.100000001);
INSERT INTO order_details VALUES (10390, 46, 9.60000038, 45, 0);
INSERT INTO order_details VALUES (10390, 72, 27.7999992, 24, 0.100000001);
INSERT INTO order_details VALUES (10391, 13, 4.80000019, 18, 0);
INSERT INTO order_details VALUES (10392, 69, 28.7999992, 50, 0);
INSERT INTO order_details VALUES (10393, 2, 15.1999998, 25, 0.25);
INSERT INTO order_details VALUES (10393, 14, 18.6000004, 42, 0.25);
INSERT INTO order_details VALUES (10393, 25, 11.1999998, 7, 0.25);
INSERT INTO order_details VALUES (10393, 26, 24.8999996, 70, 0.25);
INSERT INTO order_details VALUES (10393, 31, 10, 32, 0);
INSERT INTO order_details VALUES (10394, 13, 4.80000019, 10, 0);
INSERT INTO order_details VALUES (10394, 62, 39.4000015, 10, 0);
INSERT INTO order_details VALUES (10395, 46, 9.60000038, 28, 0.100000001);
INSERT INTO order_details VALUES (10395, 53, 26.2000008, 70, 0.100000001);
INSERT INTO order_details VALUES (10395, 69, 28.7999992, 8, 0);
INSERT INTO order_details VALUES (10396, 23, 7.19999981, 40, 0);
INSERT INTO order_details VALUES (10396, 71, 17.2000008, 60, 0);
INSERT INTO order_details VALUES (10396, 72, 27.7999992, 21, 0);
INSERT INTO order_details VALUES (10397, 21, 8, 10, 0.150000006);
INSERT INTO order_details VALUES (10397, 51, 42.4000015, 18, 0.150000006);
INSERT INTO order_details VALUES (10398, 35, 14.3999996, 30, 0);
INSERT INTO order_details VALUES (10398, 55, 19.2000008, 120, 0.100000001);
INSERT INTO order_details VALUES (10399, 68, 10, 60, 0);
INSERT INTO order_details VALUES (10399, 71, 17.2000008, 30, 0);
INSERT INTO order_details VALUES (10399, 76, 14.3999996, 35, 0);
INSERT INTO order_details VALUES (10399, 77, 10.3999996, 14, 0);
INSERT INTO order_details VALUES (10400, 29, 99, 21, 0);
INSERT INTO order_details VALUES (10400, 35, 14.3999996, 35, 0);
INSERT INTO order_details VALUES (10400, 49, 16, 30, 0);
INSERT INTO order_details VALUES (10401, 30, 20.7000008, 18, 0);
INSERT INTO order_details VALUES (10401, 56, 30.3999996, 70, 0);
INSERT INTO order_details VALUES (10401, 65, 16.7999992, 20, 0);
INSERT INTO order_details VALUES (10401, 71, 17.2000008, 60, 0);
INSERT INTO order_details VALUES (10402, 23, 7.19999981, 60, 0);
INSERT INTO order_details VALUES (10402, 63, 35.0999985, 65, 0);
INSERT INTO order_details VALUES (10403, 16, 13.8999996, 21, 0.150000006);
INSERT INTO order_details VALUES (10403, 48, 10.1999998, 70, 0.150000006);
INSERT INTO order_details VALUES (10404, 26, 24.8999996, 30, 0.0500000007);
INSERT INTO order_details VALUES (10404, 42, 11.1999998, 40, 0.0500000007);
INSERT INTO order_details VALUES (10404, 49, 16, 30, 0.0500000007);
INSERT INTO order_details VALUES (10405, 3, 8, 50, 0);
INSERT INTO order_details VALUES (10406, 1, 14.3999996, 10, 0);
INSERT INTO order_details VALUES (10406, 21, 8, 30, 0.100000001);
INSERT INTO order_details VALUES (10406, 28, 36.4000015, 42, 0.100000001);
INSERT INTO order_details VALUES (10406, 36, 15.1999998, 5, 0.100000001);
INSERT INTO order_details VALUES (10406, 40, 14.6999998, 2, 0.100000001);
INSERT INTO order_details VALUES (10407, 11, 16.7999992, 30, 0);
INSERT INTO order_details VALUES (10407, 69, 28.7999992, 15, 0);
INSERT INTO order_details VALUES (10407, 71, 17.2000008, 15, 0);
INSERT INTO order_details VALUES (10408, 37, 20.7999992, 10, 0);
INSERT INTO order_details VALUES (10408, 54, 5.9000001, 6, 0);
INSERT INTO order_details VALUES (10408, 62, 39.4000015, 35, 0);
INSERT INTO order_details VALUES (10409, 14, 18.6000004, 12, 0);
INSERT INTO order_details VALUES (10409, 21, 8, 12, 0);
INSERT INTO order_details VALUES (10410, 33, 2, 49, 0);
INSERT INTO order_details VALUES (10410, 59, 44, 16, 0);
INSERT INTO order_details VALUES (10411, 41, 7.69999981, 25, 0.200000003);
INSERT INTO order_details VALUES (10411, 44, 15.5, 40, 0.200000003);
INSERT INTO order_details VALUES (10411, 59, 44, 9, 0.200000003);
INSERT INTO order_details VALUES (10412, 14, 18.6000004, 20, 0.100000001);
INSERT INTO order_details VALUES (10413, 1, 14.3999996, 24, 0);
INSERT INTO order_details VALUES (10413, 62, 39.4000015, 40, 0);
INSERT INTO order_details VALUES (10413, 76, 14.3999996, 14, 0);
INSERT INTO order_details VALUES (10414, 19, 7.30000019, 18, 0.0500000007);
INSERT INTO order_details VALUES (10414, 33, 2, 50, 0);
INSERT INTO order_details VALUES (10415, 17, 31.2000008, 2, 0);
INSERT INTO order_details VALUES (10415, 33, 2, 20, 0);
INSERT INTO order_details VALUES (10416, 19, 7.30000019, 20, 0);
INSERT INTO order_details VALUES (10416, 53, 26.2000008, 10, 0);
INSERT INTO order_details VALUES (10416, 57, 15.6000004, 20, 0);
INSERT INTO order_details VALUES (10417, 38, 210.800003, 50, 0);
INSERT INTO order_details VALUES (10417, 46, 9.60000038, 2, 0.25);
INSERT INTO order_details VALUES (10417, 68, 10, 36, 0.25);
INSERT INTO order_details VALUES (10417, 77, 10.3999996, 35, 0);
INSERT INTO order_details VALUES (10418, 2, 15.1999998, 60, 0);
INSERT INTO order_details VALUES (10418, 47, 7.5999999, 55, 0);
INSERT INTO order_details VALUES (10418, 61, 22.7999992, 16, 0);
INSERT INTO order_details VALUES (10418, 74, 8, 15, 0);
INSERT INTO order_details VALUES (10419, 60, 27.2000008, 60, 0.0500000007);
INSERT INTO order_details VALUES (10419, 69, 28.7999992, 20, 0.0500000007);
INSERT INTO order_details VALUES (10420, 9, 77.5999985, 20, 0.100000001);
INSERT INTO order_details VALUES (10420, 13, 4.80000019, 2, 0.100000001);
INSERT INTO order_details VALUES (10420, 70, 12, 8, 0.100000001);
INSERT INTO order_details VALUES (10420, 73, 12, 20, 0.100000001);
INSERT INTO order_details VALUES (10421, 19, 7.30000019, 4, 0.150000006);
INSERT INTO order_details VALUES (10421, 26, 24.8999996, 30, 0);
INSERT INTO order_details VALUES (10421, 53, 26.2000008, 15, 0.150000006);
INSERT INTO order_details VALUES (10421, 77, 10.3999996, 10, 0.150000006);
INSERT INTO order_details VALUES (10422, 26, 24.8999996, 2, 0);
INSERT INTO order_details VALUES (10423, 31, 10, 14, 0);
INSERT INTO order_details VALUES (10423, 59, 44, 20, 0);
INSERT INTO order_details VALUES (10424, 35, 14.3999996, 60, 0.200000003);
INSERT INTO order_details VALUES (10424, 38, 210.800003, 49, 0.200000003);
INSERT INTO order_details VALUES (10424, 68, 10, 30, 0.200000003);
INSERT INTO order_details VALUES (10425, 55, 19.2000008, 10, 0.25);
INSERT INTO order_details VALUES (10425, 76, 14.3999996, 20, 0.25);
INSERT INTO order_details VALUES (10426, 56, 30.3999996, 5, 0);
INSERT INTO order_details VALUES (10426, 64, 26.6000004, 7, 0);
INSERT INTO order_details VALUES (10427, 14, 18.6000004, 35, 0);
INSERT INTO order_details VALUES (10428, 46, 9.60000038, 20, 0);
INSERT INTO order_details VALUES (10429, 50, 13, 40, 0);
INSERT INTO order_details VALUES (10429, 63, 35.0999985, 35, 0.25);
INSERT INTO order_details VALUES (10430, 17, 31.2000008, 45, 0.200000003);
INSERT INTO order_details VALUES (10430, 21, 8, 50, 0);
INSERT INTO order_details VALUES (10430, 56, 30.3999996, 30, 0);
INSERT INTO order_details VALUES (10430, 59, 44, 70, 0.200000003);
INSERT INTO order_details VALUES (10431, 17, 31.2000008, 50, 0.25);
INSERT INTO order_details VALUES (10431, 40, 14.6999998, 50, 0.25);
INSERT INTO order_details VALUES (10431, 47, 7.5999999, 30, 0.25);
INSERT INTO order_details VALUES (10432, 26, 24.8999996, 10, 0);
INSERT INTO order_details VALUES (10432, 54, 5.9000001, 40, 0);
INSERT INTO order_details VALUES (10433, 56, 30.3999996, 28, 0);
INSERT INTO order_details VALUES (10434, 11, 16.7999992, 6, 0);
INSERT INTO order_details VALUES (10434, 76, 14.3999996, 18, 0.150000006);
INSERT INTO order_details VALUES (10435, 2, 15.1999998, 10, 0);
INSERT INTO order_details VALUES (10435, 22, 16.7999992, 12, 0);
INSERT INTO order_details VALUES (10435, 72, 27.7999992, 10, 0);
INSERT INTO order_details VALUES (10436, 46, 9.60000038, 5, 0);
INSERT INTO order_details VALUES (10436, 56, 30.3999996, 40, 0.100000001);
INSERT INTO order_details VALUES (10436, 64, 26.6000004, 30, 0.100000001);
INSERT INTO order_details VALUES (10436, 75, 6.19999981, 24, 0.100000001);
INSERT INTO order_details VALUES (10437, 53, 26.2000008, 15, 0);
INSERT INTO order_details VALUES (10438, 19, 7.30000019, 15, 0.200000003);
INSERT INTO order_details VALUES (10438, 34, 11.1999998, 20, 0.200000003);
INSERT INTO order_details VALUES (10438, 57, 15.6000004, 15, 0.200000003);
INSERT INTO order_details VALUES (10439, 12, 30.3999996, 15, 0);
INSERT INTO order_details VALUES (10439, 16, 13.8999996, 16, 0);
INSERT INTO order_details VALUES (10439, 64, 26.6000004, 6, 0);
INSERT INTO order_details VALUES (10439, 74, 8, 30, 0);
INSERT INTO order_details VALUES (10440, 2, 15.1999998, 45, 0.150000006);
INSERT INTO order_details VALUES (10440, 16, 13.8999996, 49, 0.150000006);
INSERT INTO order_details VALUES (10440, 29, 99, 24, 0.150000006);
INSERT INTO order_details VALUES (10440, 61, 22.7999992, 90, 0.150000006);
INSERT INTO order_details VALUES (10441, 27, 35.0999985, 50, 0);
INSERT INTO order_details VALUES (10442, 11, 16.7999992, 30, 0);
INSERT INTO order_details VALUES (10442, 54, 5.9000001, 80, 0);
INSERT INTO order_details VALUES (10442, 66, 13.6000004, 60, 0);
INSERT INTO order_details VALUES (10443, 11, 16.7999992, 6, 0.200000003);
INSERT INTO order_details VALUES (10443, 28, 36.4000015, 12, 0);
INSERT INTO order_details VALUES (10444, 17, 31.2000008, 10, 0);
INSERT INTO order_details VALUES (10444, 26, 24.8999996, 15, 0);
INSERT INTO order_details VALUES (10444, 35, 14.3999996, 8, 0);
INSERT INTO order_details VALUES (10444, 41, 7.69999981, 30, 0);
INSERT INTO order_details VALUES (10445, 39, 14.3999996, 6, 0);
INSERT INTO order_details VALUES (10445, 54, 5.9000001, 15, 0);
INSERT INTO order_details VALUES (10446, 19, 7.30000019, 12, 0.100000001);
INSERT INTO order_details VALUES (10446, 24, 3.5999999, 20, 0.100000001);
INSERT INTO order_details VALUES (10446, 31, 10, 3, 0.100000001);
INSERT INTO order_details VALUES (10446, 52, 5.5999999, 15, 0.100000001);
INSERT INTO order_details VALUES (10447, 19, 7.30000019, 40, 0);
INSERT INTO order_details VALUES (10447, 65, 16.7999992, 35, 0);
INSERT INTO order_details VALUES (10447, 71, 17.2000008, 2, 0);
INSERT INTO order_details VALUES (10448, 26, 24.8999996, 6, 0);
INSERT INTO order_details VALUES (10448, 40, 14.6999998, 20, 0);
INSERT INTO order_details VALUES (10449, 10, 24.7999992, 14, 0);
INSERT INTO order_details VALUES (10449, 52, 5.5999999, 20, 0);
INSERT INTO order_details VALUES (10449, 62, 39.4000015, 35, 0);
INSERT INTO order_details VALUES (10450, 10, 24.7999992, 20, 0.200000003);
INSERT INTO order_details VALUES (10450, 54, 5.9000001, 6, 0.200000003);
INSERT INTO order_details VALUES (10451, 55, 19.2000008, 120, 0.100000001);
INSERT INTO order_details VALUES (10451, 64, 26.6000004, 35, 0.100000001);
INSERT INTO order_details VALUES (10451, 65, 16.7999992, 28, 0.100000001);
INSERT INTO order_details VALUES (10451, 77, 10.3999996, 55, 0.100000001);
INSERT INTO order_details VALUES (10452, 28, 36.4000015, 15, 0);
INSERT INTO order_details VALUES (10452, 44, 15.5, 100, 0.0500000007);
INSERT INTO order_details VALUES (10453, 48, 10.1999998, 15, 0.100000001);
INSERT INTO order_details VALUES (10453, 70, 12, 25, 0.100000001);
INSERT INTO order_details VALUES (10454, 16, 13.8999996, 20, 0.200000003);
INSERT INTO order_details VALUES (10454, 33, 2, 20, 0.200000003);
INSERT INTO order_details VALUES (10454, 46, 9.60000038, 10, 0.200000003);
INSERT INTO order_details VALUES (10455, 39, 14.3999996, 20, 0);
INSERT INTO order_details VALUES (10455, 53, 26.2000008, 50, 0);
INSERT INTO order_details VALUES (10455, 61, 22.7999992, 25, 0);
INSERT INTO order_details VALUES (10455, 71, 17.2000008, 30, 0);
INSERT INTO order_details VALUES (10456, 21, 8, 40, 0.150000006);
INSERT INTO order_details VALUES (10456, 49, 16, 21, 0.150000006);
INSERT INTO order_details VALUES (10457, 59, 44, 36, 0);
INSERT INTO order_details VALUES (10458, 26, 24.8999996, 30, 0);
INSERT INTO order_details VALUES (10458, 28, 36.4000015, 30, 0);
INSERT INTO order_details VALUES (10458, 43, 36.7999992, 20, 0);
INSERT INTO order_details VALUES (10458, 56, 30.3999996, 15, 0);
INSERT INTO order_details VALUES (10458, 71, 17.2000008, 50, 0);
INSERT INTO order_details VALUES (10459, 7, 24, 16, 0.0500000007);
INSERT INTO order_details VALUES (10459, 46, 9.60000038, 20, 0.0500000007);
INSERT INTO order_details VALUES (10459, 72, 27.7999992, 40, 0);
INSERT INTO order_details VALUES (10460, 68, 10, 21, 0.25);
INSERT INTO order_details VALUES (10460, 75, 6.19999981, 4, 0.25);
INSERT INTO order_details VALUES (10461, 21, 8, 40, 0.25);
INSERT INTO order_details VALUES (10461, 30, 20.7000008, 28, 0.25);
INSERT INTO order_details VALUES (10461, 55, 19.2000008, 60, 0.25);
INSERT INTO order_details VALUES (10462, 13, 4.80000019, 1, 0);
INSERT INTO order_details VALUES (10462, 23, 7.19999981, 21, 0);
INSERT INTO order_details VALUES (10463, 19, 7.30000019, 21, 0);
INSERT INTO order_details VALUES (10463, 42, 11.1999998, 50, 0);
INSERT INTO order_details VALUES (10464, 4, 17.6000004, 16, 0.200000003);
INSERT INTO order_details VALUES (10464, 43, 36.7999992, 3, 0);
INSERT INTO order_details VALUES (10464, 56, 30.3999996, 30, 0.200000003);
INSERT INTO order_details VALUES (10464, 60, 27.2000008, 20, 0);
INSERT INTO order_details VALUES (10465, 24, 3.5999999, 25, 0);
INSERT INTO order_details VALUES (10465, 29, 99, 18, 0.100000001);
INSERT INTO order_details VALUES (10465, 40, 14.6999998, 20, 0);
INSERT INTO order_details VALUES (10465, 45, 7.5999999, 30, 0.100000001);
INSERT INTO order_details VALUES (10465, 50, 13, 25, 0);
INSERT INTO order_details VALUES (10466, 11, 16.7999992, 10, 0);
INSERT INTO order_details VALUES (10466, 46, 9.60000038, 5, 0);
INSERT INTO order_details VALUES (10467, 24, 3.5999999, 28, 0);
INSERT INTO order_details VALUES (10467, 25, 11.1999998, 12, 0);
INSERT INTO order_details VALUES (10468, 30, 20.7000008, 8, 0);
INSERT INTO order_details VALUES (10468, 43, 36.7999992, 15, 0);
INSERT INTO order_details VALUES (10469, 2, 15.1999998, 40, 0.150000006);
INSERT INTO order_details VALUES (10469, 16, 13.8999996, 35, 0.150000006);
INSERT INTO order_details VALUES (10469, 44, 15.5, 2, 0.150000006);
INSERT INTO order_details VALUES (10470, 18, 50, 30, 0);
INSERT INTO order_details VALUES (10470, 23, 7.19999981, 15, 0);
INSERT INTO order_details VALUES (10470, 64, 26.6000004, 8, 0);
INSERT INTO order_details VALUES (10471, 7, 24, 30, 0);
INSERT INTO order_details VALUES (10471, 56, 30.3999996, 20, 0);
INSERT INTO order_details VALUES (10472, 24, 3.5999999, 80, 0.0500000007);
INSERT INTO order_details VALUES (10472, 51, 42.4000015, 18, 0);
INSERT INTO order_details VALUES (10473, 33, 2, 12, 0);
INSERT INTO order_details VALUES (10473, 71, 17.2000008, 12, 0);
INSERT INTO order_details VALUES (10474, 14, 18.6000004, 12, 0);
INSERT INTO order_details VALUES (10474, 28, 36.4000015, 18, 0);
INSERT INTO order_details VALUES (10474, 40, 14.6999998, 21, 0);
INSERT INTO order_details VALUES (10474, 75, 6.19999981, 10, 0);
INSERT INTO order_details VALUES (10475, 31, 10, 35, 0.150000006);
INSERT INTO order_details VALUES (10475, 66, 13.6000004, 60, 0.150000006);
INSERT INTO order_details VALUES (10475, 76, 14.3999996, 42, 0.150000006);
INSERT INTO order_details VALUES (10476, 55, 19.2000008, 2, 0.0500000007);
INSERT INTO order_details VALUES (10476, 70, 12, 12, 0);
INSERT INTO order_details VALUES (10477, 1, 14.3999996, 15, 0);
INSERT INTO order_details VALUES (10477, 21, 8, 21, 0.25);
INSERT INTO order_details VALUES (10477, 39, 14.3999996, 20, 0.25);
INSERT INTO order_details VALUES (10478, 10, 24.7999992, 20, 0.0500000007);
INSERT INTO order_details VALUES (10479, 38, 210.800003, 30, 0);
INSERT INTO order_details VALUES (10479, 53, 26.2000008, 28, 0);
INSERT INTO order_details VALUES (10479, 59, 44, 60, 0);
INSERT INTO order_details VALUES (10479, 64, 26.6000004, 30, 0);
INSERT INTO order_details VALUES (10480, 47, 7.5999999, 30, 0);
INSERT INTO order_details VALUES (10480, 59, 44, 12, 0);
INSERT INTO order_details VALUES (10481, 49, 16, 24, 0);
INSERT INTO order_details VALUES (10481, 60, 27.2000008, 40, 0);
INSERT INTO order_details VALUES (10482, 40, 14.6999998, 10, 0);
INSERT INTO order_details VALUES (10483, 34, 11.1999998, 35, 0.0500000007);
INSERT INTO order_details VALUES (10483, 77, 10.3999996, 30, 0.0500000007);
INSERT INTO order_details VALUES (10484, 21, 8, 14, 0);
INSERT INTO order_details VALUES (10484, 40, 14.6999998, 10, 0);
INSERT INTO order_details VALUES (10484, 51, 42.4000015, 3, 0);
INSERT INTO order_details VALUES (10485, 2, 15.1999998, 20, 0.100000001);
INSERT INTO order_details VALUES (10485, 3, 8, 20, 0.100000001);
INSERT INTO order_details VALUES (10485, 55, 19.2000008, 30, 0.100000001);
INSERT INTO order_details VALUES (10485, 70, 12, 60, 0.100000001);
INSERT INTO order_details VALUES (10486, 11, 16.7999992, 5, 0);
INSERT INTO order_details VALUES (10486, 51, 42.4000015, 25, 0);
INSERT INTO order_details VALUES (10486, 74, 8, 16, 0);
INSERT INTO order_details VALUES (10487, 19, 7.30000019, 5, 0);
INSERT INTO order_details VALUES (10487, 26, 24.8999996, 30, 0);
INSERT INTO order_details VALUES (10487, 54, 5.9000001, 24, 0.25);
INSERT INTO order_details VALUES (10488, 59, 44, 30, 0);
INSERT INTO order_details VALUES (10488, 73, 12, 20, 0.200000003);
INSERT INTO order_details VALUES (10489, 11, 16.7999992, 15, 0.25);
INSERT INTO order_details VALUES (10489, 16, 13.8999996, 18, 0);
INSERT INTO order_details VALUES (10490, 59, 44, 60, 0);
INSERT INTO order_details VALUES (10490, 68, 10, 30, 0);
INSERT INTO order_details VALUES (10490, 75, 6.19999981, 36, 0);
INSERT INTO order_details VALUES (10491, 44, 15.5, 15, 0.150000006);
INSERT INTO order_details VALUES (10491, 77, 10.3999996, 7, 0.150000006);
INSERT INTO order_details VALUES (10492, 25, 11.1999998, 60, 0.0500000007);
INSERT INTO order_details VALUES (10492, 42, 11.1999998, 20, 0.0500000007);
INSERT INTO order_details VALUES (10493, 65, 16.7999992, 15, 0.100000001);
INSERT INTO order_details VALUES (10493, 66, 13.6000004, 10, 0.100000001);
INSERT INTO order_details VALUES (10493, 69, 28.7999992, 10, 0.100000001);
INSERT INTO order_details VALUES (10494, 56, 30.3999996, 30, 0);
INSERT INTO order_details VALUES (10495, 23, 7.19999981, 10, 0);
INSERT INTO order_details VALUES (10495, 41, 7.69999981, 20, 0);
INSERT INTO order_details VALUES (10495, 77, 10.3999996, 5, 0);
INSERT INTO order_details VALUES (10496, 31, 10, 20, 0.0500000007);
INSERT INTO order_details VALUES (10497, 56, 30.3999996, 14, 0);
INSERT INTO order_details VALUES (10497, 72, 27.7999992, 25, 0);
INSERT INTO order_details VALUES (10497, 77, 10.3999996, 25, 0);
INSERT INTO order_details VALUES (10498, 24, 4.5, 14, 0);
INSERT INTO order_details VALUES (10498, 40, 18.3999996, 5, 0);
INSERT INTO order_details VALUES (10498, 42, 14, 30, 0);
INSERT INTO order_details VALUES (10499, 28, 45.5999985, 20, 0);
INSERT INTO order_details VALUES (10499, 49, 20, 25, 0);
INSERT INTO order_details VALUES (10500, 15, 15.5, 12, 0.0500000007);
INSERT INTO order_details VALUES (10500, 28, 45.5999985, 8, 0.0500000007);
INSERT INTO order_details VALUES (10501, 54, 7.44999981, 20, 0);
INSERT INTO order_details VALUES (10502, 45, 9.5, 21, 0);
INSERT INTO order_details VALUES (10502, 53, 32.7999992, 6, 0);
INSERT INTO order_details VALUES (10502, 67, 14, 30, 0);
INSERT INTO order_details VALUES (10503, 14, 23.25, 70, 0);
INSERT INTO order_details VALUES (10503, 65, 21.0499992, 20, 0);
INSERT INTO order_details VALUES (10504, 2, 19, 12, 0);
INSERT INTO order_details VALUES (10504, 21, 10, 12, 0);
INSERT INTO order_details VALUES (10504, 53, 32.7999992, 10, 0);
INSERT INTO order_details VALUES (10504, 61, 28.5, 25, 0);
INSERT INTO order_details VALUES (10505, 62, 49.2999992, 3, 0);
INSERT INTO order_details VALUES (10506, 25, 14, 18, 0.100000001);
INSERT INTO order_details VALUES (10506, 70, 15, 14, 0.100000001);
INSERT INTO order_details VALUES (10507, 43, 46, 15, 0.150000006);
INSERT INTO order_details VALUES (10507, 48, 12.75, 15, 0.150000006);
INSERT INTO order_details VALUES (10508, 13, 6, 10, 0);
INSERT INTO order_details VALUES (10508, 39, 18, 10, 0);
INSERT INTO order_details VALUES (10509, 28, 45.5999985, 3, 0);
INSERT INTO order_details VALUES (10510, 29, 123.790001, 36, 0);
INSERT INTO order_details VALUES (10510, 75, 7.75, 36, 0.100000001);
INSERT INTO order_details VALUES (10511, 4, 22, 50, 0.150000006);
INSERT INTO order_details VALUES (10511, 7, 30, 50, 0.150000006);
INSERT INTO order_details VALUES (10511, 8, 40, 10, 0.150000006);
INSERT INTO order_details VALUES (10512, 24, 4.5, 10, 0.150000006);
INSERT INTO order_details VALUES (10512, 46, 12, 9, 0.150000006);
INSERT INTO order_details VALUES (10512, 47, 9.5, 6, 0.150000006);
INSERT INTO order_details VALUES (10512, 60, 34, 12, 0.150000006);
INSERT INTO order_details VALUES (10513, 21, 10, 40, 0.200000003);
INSERT INTO order_details VALUES (10513, 32, 32, 50, 0.200000003);
INSERT INTO order_details VALUES (10513, 61, 28.5, 15, 0.200000003);
INSERT INTO order_details VALUES (10514, 20, 81, 39, 0);
INSERT INTO order_details VALUES (10514, 28, 45.5999985, 35, 0);
INSERT INTO order_details VALUES (10514, 56, 38, 70, 0);
INSERT INTO order_details VALUES (10514, 65, 21.0499992, 39, 0);
INSERT INTO order_details VALUES (10514, 75, 7.75, 50, 0);
INSERT INTO order_details VALUES (10515, 9, 97, 16, 0.150000006);
INSERT INTO order_details VALUES (10515, 16, 17.4500008, 50, 0);
INSERT INTO order_details VALUES (10515, 27, 43.9000015, 120, 0);
INSERT INTO order_details VALUES (10515, 33, 2.5, 16, 0.150000006);
INSERT INTO order_details VALUES (10515, 60, 34, 84, 0.150000006);
INSERT INTO order_details VALUES (10516, 18, 62.5, 25, 0.100000001);
INSERT INTO order_details VALUES (10516, 41, 9.64999962, 80, 0.100000001);
INSERT INTO order_details VALUES (10516, 42, 14, 20, 0);
INSERT INTO order_details VALUES (10517, 52, 7, 6, 0);
INSERT INTO order_details VALUES (10517, 59, 55, 4, 0);
INSERT INTO order_details VALUES (10517, 70, 15, 6, 0);
INSERT INTO order_details VALUES (10518, 24, 4.5, 5, 0);
INSERT INTO order_details VALUES (10518, 38, 263.5, 15, 0);
INSERT INTO order_details VALUES (10518, 44, 19.4500008, 9, 0);
INSERT INTO order_details VALUES (10519, 10, 31, 16, 0.0500000007);
INSERT INTO order_details VALUES (10519, 56, 38, 40, 0);
INSERT INTO order_details VALUES (10519, 60, 34, 10, 0.0500000007);
INSERT INTO order_details VALUES (10520, 24, 4.5, 8, 0);
INSERT INTO order_details VALUES (10520, 53, 32.7999992, 5, 0);
INSERT INTO order_details VALUES (10521, 35, 18, 3, 0);
INSERT INTO order_details VALUES (10521, 41, 9.64999962, 10, 0);
INSERT INTO order_details VALUES (10521, 68, 12.5, 6, 0);
INSERT INTO order_details VALUES (10522, 1, 18, 40, 0.200000003);
INSERT INTO order_details VALUES (10522, 8, 40, 24, 0);
INSERT INTO order_details VALUES (10522, 30, 25.8899994, 20, 0.200000003);
INSERT INTO order_details VALUES (10522, 40, 18.3999996, 25, 0.200000003);
INSERT INTO order_details VALUES (10523, 17, 39, 25, 0.100000001);
INSERT INTO order_details VALUES (10523, 20, 81, 15, 0.100000001);
INSERT INTO order_details VALUES (10523, 37, 26, 18, 0.100000001);
INSERT INTO order_details VALUES (10523, 41, 9.64999962, 6, 0.100000001);
INSERT INTO order_details VALUES (10524, 10, 31, 2, 0);
INSERT INTO order_details VALUES (10524, 30, 25.8899994, 10, 0);
INSERT INTO order_details VALUES (10524, 43, 46, 60, 0);
INSERT INTO order_details VALUES (10524, 54, 7.44999981, 15, 0);
INSERT INTO order_details VALUES (10525, 36, 19, 30, 0);
INSERT INTO order_details VALUES (10525, 40, 18.3999996, 15, 0.100000001);
INSERT INTO order_details VALUES (10526, 1, 18, 8, 0.150000006);
INSERT INTO order_details VALUES (10526, 13, 6, 10, 0);
INSERT INTO order_details VALUES (10526, 56, 38, 30, 0.150000006);
INSERT INTO order_details VALUES (10527, 4, 22, 50, 0.100000001);
INSERT INTO order_details VALUES (10527, 36, 19, 30, 0.100000001);
INSERT INTO order_details VALUES (10528, 11, 21, 3, 0);
INSERT INTO order_details VALUES (10528, 33, 2.5, 8, 0.200000003);
INSERT INTO order_details VALUES (10528, 72, 34.7999992, 9, 0);
INSERT INTO order_details VALUES (10529, 55, 24, 14, 0);
INSERT INTO order_details VALUES (10529, 68, 12.5, 20, 0);
INSERT INTO order_details VALUES (10529, 69, 36, 10, 0);
INSERT INTO order_details VALUES (10530, 17, 39, 40, 0);
INSERT INTO order_details VALUES (10530, 43, 46, 25, 0);
INSERT INTO order_details VALUES (10530, 61, 28.5, 20, 0);
INSERT INTO order_details VALUES (10530, 76, 18, 50, 0);
INSERT INTO order_details VALUES (10531, 59, 55, 2, 0);
INSERT INTO order_details VALUES (10532, 30, 25.8899994, 15, 0);
INSERT INTO order_details VALUES (10532, 66, 17, 24, 0);
INSERT INTO order_details VALUES (10533, 4, 22, 50, 0.0500000007);
INSERT INTO order_details VALUES (10533, 72, 34.7999992, 24, 0);
INSERT INTO order_details VALUES (10533, 73, 15, 24, 0.0500000007);
INSERT INTO order_details VALUES (10534, 30, 25.8899994, 10, 0);
INSERT INTO order_details VALUES (10534, 40, 18.3999996, 10, 0.200000003);
INSERT INTO order_details VALUES (10534, 54, 7.44999981, 10, 0.200000003);
INSERT INTO order_details VALUES (10535, 11, 21, 50, 0.100000001);
INSERT INTO order_details VALUES (10535, 40, 18.3999996, 10, 0.100000001);
INSERT INTO order_details VALUES (10535, 57, 19.5, 5, 0.100000001);
INSERT INTO order_details VALUES (10535, 59, 55, 15, 0.100000001);
INSERT INTO order_details VALUES (10536, 12, 38, 15, 0.25);
INSERT INTO order_details VALUES (10536, 31, 12.5, 20, 0);
INSERT INTO order_details VALUES (10536, 33, 2.5, 30, 0);
INSERT INTO order_details VALUES (10536, 60, 34, 35, 0.25);
INSERT INTO order_details VALUES (10537, 31, 12.5, 30, 0);
INSERT INTO order_details VALUES (10537, 51, 53, 6, 0);
INSERT INTO order_details VALUES (10537, 58, 13.25, 20, 0);
INSERT INTO order_details VALUES (10537, 72, 34.7999992, 21, 0);
INSERT INTO order_details VALUES (10537, 73, 15, 9, 0);
INSERT INTO order_details VALUES (10538, 70, 15, 7, 0);
INSERT INTO order_details VALUES (10538, 72, 34.7999992, 1, 0);
INSERT INTO order_details VALUES (10539, 13, 6, 8, 0);
INSERT INTO order_details VALUES (10539, 21, 10, 15, 0);
INSERT INTO order_details VALUES (10539, 33, 2.5, 15, 0);
INSERT INTO order_details VALUES (10539, 49, 20, 6, 0);
INSERT INTO order_details VALUES (10540, 3, 10, 60, 0);
INSERT INTO order_details VALUES (10540, 26, 31.2299995, 40, 0);
INSERT INTO order_details VALUES (10540, 38, 263.5, 30, 0);
INSERT INTO order_details VALUES (10540, 68, 12.5, 35, 0);
INSERT INTO order_details VALUES (10541, 24, 4.5, 35, 0.100000001);
INSERT INTO order_details VALUES (10541, 38, 263.5, 4, 0.100000001);
INSERT INTO order_details VALUES (10541, 65, 21.0499992, 36, 0.100000001);
INSERT INTO order_details VALUES (10541, 71, 21.5, 9, 0.100000001);
INSERT INTO order_details VALUES (10542, 11, 21, 15, 0.0500000007);
INSERT INTO order_details VALUES (10542, 54, 7.44999981, 24, 0.0500000007);
INSERT INTO order_details VALUES (10543, 12, 38, 30, 0.150000006);
INSERT INTO order_details VALUES (10543, 23, 9, 70, 0.150000006);
INSERT INTO order_details VALUES (10544, 28, 45.5999985, 7, 0);
INSERT INTO order_details VALUES (10544, 67, 14, 7, 0);
INSERT INTO order_details VALUES (10545, 11, 21, 10, 0);
INSERT INTO order_details VALUES (10546, 7, 30, 10, 0);
INSERT INTO order_details VALUES (10546, 35, 18, 30, 0);
INSERT INTO order_details VALUES (10546, 62, 49.2999992, 40, 0);
INSERT INTO order_details VALUES (10547, 32, 32, 24, 0.150000006);
INSERT INTO order_details VALUES (10547, 36, 19, 60, 0);
INSERT INTO order_details VALUES (10548, 34, 14, 10, 0.25);
INSERT INTO order_details VALUES (10548, 41, 9.64999962, 14, 0);
INSERT INTO order_details VALUES (10549, 31, 12.5, 55, 0.150000006);
INSERT INTO order_details VALUES (10549, 45, 9.5, 100, 0.150000006);
INSERT INTO order_details VALUES (10549, 51, 53, 48, 0.150000006);
INSERT INTO order_details VALUES (10550, 17, 39, 8, 0.100000001);
INSERT INTO order_details VALUES (10550, 19, 9.19999981, 10, 0);
INSERT INTO order_details VALUES (10550, 21, 10, 6, 0.100000001);
INSERT INTO order_details VALUES (10550, 61, 28.5, 10, 0.100000001);
INSERT INTO order_details VALUES (10551, 16, 17.4500008, 40, 0.150000006);
INSERT INTO order_details VALUES (10551, 35, 18, 20, 0.150000006);
INSERT INTO order_details VALUES (10551, 44, 19.4500008, 40, 0);
INSERT INTO order_details VALUES (10552, 69, 36, 18, 0);
INSERT INTO order_details VALUES (10552, 75, 7.75, 30, 0);
INSERT INTO order_details VALUES (10553, 11, 21, 15, 0);
INSERT INTO order_details VALUES (10553, 16, 17.4500008, 14, 0);
INSERT INTO order_details VALUES (10553, 22, 21, 24, 0);
INSERT INTO order_details VALUES (10553, 31, 12.5, 30, 0);
INSERT INTO order_details VALUES (10553, 35, 18, 6, 0);
INSERT INTO order_details VALUES (10554, 16, 17.4500008, 30, 0.0500000007);
INSERT INTO order_details VALUES (10554, 23, 9, 20, 0.0500000007);
INSERT INTO order_details VALUES (10554, 62, 49.2999992, 20, 0.0500000007);
INSERT INTO order_details VALUES (10554, 77, 13, 10, 0.0500000007);
INSERT INTO order_details VALUES (10555, 14, 23.25, 30, 0.200000003);
INSERT INTO order_details VALUES (10555, 19, 9.19999981, 35, 0.200000003);
INSERT INTO order_details VALUES (10555, 24, 4.5, 18, 0.200000003);
INSERT INTO order_details VALUES (10555, 51, 53, 20, 0.200000003);
INSERT INTO order_details VALUES (10555, 56, 38, 40, 0.200000003);
INSERT INTO order_details VALUES (10556, 72, 34.7999992, 24, 0);
INSERT INTO order_details VALUES (10557, 64, 33.25, 30, 0);
INSERT INTO order_details VALUES (10557, 75, 7.75, 20, 0);
INSERT INTO order_details VALUES (10558, 47, 9.5, 25, 0);
INSERT INTO order_details VALUES (10558, 51, 53, 20, 0);
INSERT INTO order_details VALUES (10558, 52, 7, 30, 0);
INSERT INTO order_details VALUES (10558, 53, 32.7999992, 18, 0);
INSERT INTO order_details VALUES (10558, 73, 15, 3, 0);
INSERT INTO order_details VALUES (10559, 41, 9.64999962, 12, 0.0500000007);
INSERT INTO order_details VALUES (10559, 55, 24, 18, 0.0500000007);
INSERT INTO order_details VALUES (10560, 30, 25.8899994, 20, 0);
INSERT INTO order_details VALUES (10560, 62, 49.2999992, 15, 0.25);
INSERT INTO order_details VALUES (10561, 44, 19.4500008, 10, 0);
INSERT INTO order_details VALUES (10561, 51, 53, 50, 0);
INSERT INTO order_details VALUES (10562, 33, 2.5, 20, 0.100000001);
INSERT INTO order_details VALUES (10562, 62, 49.2999992, 10, 0.100000001);
INSERT INTO order_details VALUES (10563, 36, 19, 25, 0);
INSERT INTO order_details VALUES (10563, 52, 7, 70, 0);
INSERT INTO order_details VALUES (10564, 17, 39, 16, 0.0500000007);
INSERT INTO order_details VALUES (10564, 31, 12.5, 6, 0.0500000007);
INSERT INTO order_details VALUES (10564, 55, 24, 25, 0.0500000007);
INSERT INTO order_details VALUES (10565, 24, 4.5, 25, 0.100000001);
INSERT INTO order_details VALUES (10565, 64, 33.25, 18, 0.100000001);
INSERT INTO order_details VALUES (10566, 11, 21, 35, 0.150000006);
INSERT INTO order_details VALUES (10566, 18, 62.5, 18, 0.150000006);
INSERT INTO order_details VALUES (10566, 76, 18, 10, 0);
INSERT INTO order_details VALUES (10567, 31, 12.5, 60, 0.200000003);
INSERT INTO order_details VALUES (10567, 51, 53, 3, 0);
INSERT INTO order_details VALUES (10567, 59, 55, 40, 0.200000003);
INSERT INTO order_details VALUES (10568, 10, 31, 5, 0);
INSERT INTO order_details VALUES (10569, 31, 12.5, 35, 0.200000003);
INSERT INTO order_details VALUES (10569, 76, 18, 30, 0);
INSERT INTO order_details VALUES (10570, 11, 21, 15, 0.0500000007);
INSERT INTO order_details VALUES (10570, 56, 38, 60, 0.0500000007);
INSERT INTO order_details VALUES (10571, 14, 23.25, 11, 0.150000006);
INSERT INTO order_details VALUES (10571, 42, 14, 28, 0.150000006);
INSERT INTO order_details VALUES (10572, 16, 17.4500008, 12, 0.100000001);
INSERT INTO order_details VALUES (10572, 32, 32, 10, 0.100000001);
INSERT INTO order_details VALUES (10572, 40, 18.3999996, 50, 0);
INSERT INTO order_details VALUES (10572, 75, 7.75, 15, 0.100000001);
INSERT INTO order_details VALUES (10573, 17, 39, 18, 0);
INSERT INTO order_details VALUES (10573, 34, 14, 40, 0);
INSERT INTO order_details VALUES (10573, 53, 32.7999992, 25, 0);
INSERT INTO order_details VALUES (10574, 33, 2.5, 14, 0);
INSERT INTO order_details VALUES (10574, 40, 18.3999996, 2, 0);
INSERT INTO order_details VALUES (10574, 62, 49.2999992, 10, 0);
INSERT INTO order_details VALUES (10574, 64, 33.25, 6, 0);
INSERT INTO order_details VALUES (10575, 59, 55, 12, 0);
INSERT INTO order_details VALUES (10575, 63, 43.9000015, 6, 0);
INSERT INTO order_details VALUES (10575, 72, 34.7999992, 30, 0);
INSERT INTO order_details VALUES (10575, 76, 18, 10, 0);
INSERT INTO order_details VALUES (10576, 1, 18, 10, 0);
INSERT INTO order_details VALUES (10576, 31, 12.5, 20, 0);
INSERT INTO order_details VALUES (10576, 44, 19.4500008, 21, 0);
INSERT INTO order_details VALUES (10577, 39, 18, 10, 0);
INSERT INTO order_details VALUES (10577, 75, 7.75, 20, 0);
INSERT INTO order_details VALUES (10577, 77, 13, 18, 0);
INSERT INTO order_details VALUES (10578, 35, 18, 20, 0);
INSERT INTO order_details VALUES (10578, 57, 19.5, 6, 0);
INSERT INTO order_details VALUES (10579, 15, 15.5, 10, 0);
INSERT INTO order_details VALUES (10579, 75, 7.75, 21, 0);
INSERT INTO order_details VALUES (10580, 14, 23.25, 15, 0.0500000007);
INSERT INTO order_details VALUES (10580, 41, 9.64999962, 9, 0.0500000007);
INSERT INTO order_details VALUES (10580, 65, 21.0499992, 30, 0.0500000007);
INSERT INTO order_details VALUES (10581, 75, 7.75, 50, 0.200000003);
INSERT INTO order_details VALUES (10582, 57, 19.5, 4, 0);
INSERT INTO order_details VALUES (10582, 76, 18, 14, 0);
INSERT INTO order_details VALUES (10583, 29, 123.790001, 10, 0);
INSERT INTO order_details VALUES (10583, 60, 34, 24, 0.150000006);
INSERT INTO order_details VALUES (10583, 69, 36, 10, 0.150000006);
INSERT INTO order_details VALUES (10584, 31, 12.5, 50, 0.0500000007);
INSERT INTO order_details VALUES (10585, 47, 9.5, 15, 0);
INSERT INTO order_details VALUES (10586, 52, 7, 4, 0.150000006);
INSERT INTO order_details VALUES (10587, 26, 31.2299995, 6, 0);
INSERT INTO order_details VALUES (10587, 35, 18, 20, 0);
INSERT INTO order_details VALUES (10587, 77, 13, 20, 0);
INSERT INTO order_details VALUES (10588, 18, 62.5, 40, 0.200000003);
INSERT INTO order_details VALUES (10588, 42, 14, 100, 0.200000003);
INSERT INTO order_details VALUES (10589, 35, 18, 4, 0);
INSERT INTO order_details VALUES (10590, 1, 18, 20, 0);
INSERT INTO order_details VALUES (10590, 77, 13, 60, 0.0500000007);
INSERT INTO order_details VALUES (10591, 3, 10, 14, 0);
INSERT INTO order_details VALUES (10591, 7, 30, 10, 0);
INSERT INTO order_details VALUES (10591, 54, 7.44999981, 50, 0);
INSERT INTO order_details VALUES (10592, 15, 15.5, 25, 0.0500000007);
INSERT INTO order_details VALUES (10592, 26, 31.2299995, 5, 0.0500000007);
INSERT INTO order_details VALUES (10593, 20, 81, 21, 0.200000003);
INSERT INTO order_details VALUES (10593, 69, 36, 20, 0.200000003);
INSERT INTO order_details VALUES (10593, 76, 18, 4, 0.200000003);
INSERT INTO order_details VALUES (10594, 52, 7, 24, 0);
INSERT INTO order_details VALUES (10594, 58, 13.25, 30, 0);
INSERT INTO order_details VALUES (10595, 35, 18, 30, 0.25);
INSERT INTO order_details VALUES (10595, 61, 28.5, 120, 0.25);
INSERT INTO order_details VALUES (10595, 69, 36, 65, 0.25);
INSERT INTO order_details VALUES (10596, 56, 38, 5, 0.200000003);
INSERT INTO order_details VALUES (10596, 63, 43.9000015, 24, 0.200000003);
INSERT INTO order_details VALUES (10596, 75, 7.75, 30, 0.200000003);
INSERT INTO order_details VALUES (10597, 24, 4.5, 35, 0.200000003);
INSERT INTO order_details VALUES (10597, 57, 19.5, 20, 0);
INSERT INTO order_details VALUES (10597, 65, 21.0499992, 12, 0.200000003);
INSERT INTO order_details VALUES (10598, 27, 43.9000015, 50, 0);
INSERT INTO order_details VALUES (10598, 71, 21.5, 9, 0);
INSERT INTO order_details VALUES (10599, 62, 49.2999992, 10, 0);
INSERT INTO order_details VALUES (10600, 54, 7.44999981, 4, 0);
INSERT INTO order_details VALUES (10600, 73, 15, 30, 0);
INSERT INTO order_details VALUES (10601, 13, 6, 60, 0);
INSERT INTO order_details VALUES (10601, 59, 55, 35, 0);
INSERT INTO order_details VALUES (10602, 77, 13, 5, 0.25);
INSERT INTO order_details VALUES (10603, 22, 21, 48, 0);
INSERT INTO order_details VALUES (10603, 49, 20, 25, 0.0500000007);
INSERT INTO order_details VALUES (10604, 48, 12.75, 6, 0.100000001);
INSERT INTO order_details VALUES (10604, 76, 18, 10, 0.100000001);
INSERT INTO order_details VALUES (10605, 16, 17.4500008, 30, 0.0500000007);
INSERT INTO order_details VALUES (10605, 59, 55, 20, 0.0500000007);
INSERT INTO order_details VALUES (10605, 60, 34, 70, 0.0500000007);
INSERT INTO order_details VALUES (10605, 71, 21.5, 15, 0.0500000007);
INSERT INTO order_details VALUES (10606, 4, 22, 20, 0.200000003);
INSERT INTO order_details VALUES (10606, 55, 24, 20, 0.200000003);
INSERT INTO order_details VALUES (10606, 62, 49.2999992, 10, 0.200000003);
INSERT INTO order_details VALUES (10607, 7, 30, 45, 0);
INSERT INTO order_details VALUES (10607, 17, 39, 100, 0);
INSERT INTO order_details VALUES (10607, 33, 2.5, 14, 0);
INSERT INTO order_details VALUES (10607, 40, 18.3999996, 42, 0);
INSERT INTO order_details VALUES (10607, 72, 34.7999992, 12, 0);
INSERT INTO order_details VALUES (10608, 56, 38, 28, 0);
INSERT INTO order_details VALUES (10609, 1, 18, 3, 0);
INSERT INTO order_details VALUES (10609, 10, 31, 10, 0);
INSERT INTO order_details VALUES (10609, 21, 10, 6, 0);
INSERT INTO order_details VALUES (10610, 36, 19, 21, 0.25);
INSERT INTO order_details VALUES (10611, 1, 18, 6, 0);
INSERT INTO order_details VALUES (10611, 2, 19, 10, 0);
INSERT INTO order_details VALUES (10611, 60, 34, 15, 0);
INSERT INTO order_details VALUES (10612, 10, 31, 70, 0);
INSERT INTO order_details VALUES (10612, 36, 19, 55, 0);
INSERT INTO order_details VALUES (10612, 49, 20, 18, 0);
INSERT INTO order_details VALUES (10612, 60, 34, 40, 0);
INSERT INTO order_details VALUES (10612, 76, 18, 80, 0);
INSERT INTO order_details VALUES (10613, 13, 6, 8, 0.100000001);
INSERT INTO order_details VALUES (10613, 75, 7.75, 40, 0);
INSERT INTO order_details VALUES (10614, 11, 21, 14, 0);
INSERT INTO order_details VALUES (10614, 21, 10, 8, 0);
INSERT INTO order_details VALUES (10614, 39, 18, 5, 0);
INSERT INTO order_details VALUES (10615, 55, 24, 5, 0);
INSERT INTO order_details VALUES (10616, 38, 263.5, 15, 0.0500000007);
INSERT INTO order_details VALUES (10616, 56, 38, 14, 0);
INSERT INTO order_details VALUES (10616, 70, 15, 15, 0.0500000007);
INSERT INTO order_details VALUES (10616, 71, 21.5, 15, 0.0500000007);
INSERT INTO order_details VALUES (10617, 59, 55, 30, 0.150000006);
INSERT INTO order_details VALUES (10618, 6, 25, 70, 0);
INSERT INTO order_details VALUES (10618, 56, 38, 20, 0);
INSERT INTO order_details VALUES (10618, 68, 12.5, 15, 0);
INSERT INTO order_details VALUES (10619, 21, 10, 42, 0);
INSERT INTO order_details VALUES (10619, 22, 21, 40, 0);
INSERT INTO order_details VALUES (10620, 24, 4.5, 5, 0);
INSERT INTO order_details VALUES (10620, 52, 7, 5, 0);
INSERT INTO order_details VALUES (10621, 19, 9.19999981, 5, 0);
INSERT INTO order_details VALUES (10621, 23, 9, 10, 0);
INSERT INTO order_details VALUES (10621, 70, 15, 20, 0);
INSERT INTO order_details VALUES (10621, 71, 21.5, 15, 0);
INSERT INTO order_details VALUES (10622, 2, 19, 20, 0);
INSERT INTO order_details VALUES (10622, 68, 12.5, 18, 0.200000003);
INSERT INTO order_details VALUES (10623, 14, 23.25, 21, 0);
INSERT INTO order_details VALUES (10623, 19, 9.19999981, 15, 0.100000001);
INSERT INTO order_details VALUES (10623, 21, 10, 25, 0.100000001);
INSERT INTO order_details VALUES (10623, 24, 4.5, 3, 0);
INSERT INTO order_details VALUES (10623, 35, 18, 30, 0.100000001);
INSERT INTO order_details VALUES (10624, 28, 45.5999985, 10, 0);
INSERT INTO order_details VALUES (10624, 29, 123.790001, 6, 0);
INSERT INTO order_details VALUES (10624, 44, 19.4500008, 10, 0);
INSERT INTO order_details VALUES (10625, 14, 23.25, 3, 0);
INSERT INTO order_details VALUES (10625, 42, 14, 5, 0);
INSERT INTO order_details VALUES (10625, 60, 34, 10, 0);
INSERT INTO order_details VALUES (10626, 53, 32.7999992, 12, 0);
INSERT INTO order_details VALUES (10626, 60, 34, 20, 0);
INSERT INTO order_details VALUES (10626, 71, 21.5, 20, 0);
INSERT INTO order_details VALUES (10627, 62, 49.2999992, 15, 0);
INSERT INTO order_details VALUES (10627, 73, 15, 35, 0.150000006);
INSERT INTO order_details VALUES (10628, 1, 18, 25, 0);
INSERT INTO order_details VALUES (10629, 29, 123.790001, 20, 0);
INSERT INTO order_details VALUES (10629, 64, 33.25, 9, 0);
INSERT INTO order_details VALUES (10630, 55, 24, 12, 0.0500000007);
INSERT INTO order_details VALUES (10630, 76, 18, 35, 0);
INSERT INTO order_details VALUES (10631, 75, 7.75, 8, 0.100000001);
INSERT INTO order_details VALUES (10632, 2, 19, 30, 0.0500000007);
INSERT INTO order_details VALUES (10632, 33, 2.5, 20, 0.0500000007);
INSERT INTO order_details VALUES (10633, 12, 38, 36, 0.150000006);
INSERT INTO order_details VALUES (10633, 13, 6, 13, 0.150000006);
INSERT INTO order_details VALUES (10633, 26, 31.2299995, 35, 0.150000006);
INSERT INTO order_details VALUES (10633, 62, 49.2999992, 80, 0.150000006);
INSERT INTO order_details VALUES (10634, 7, 30, 35, 0);
INSERT INTO order_details VALUES (10634, 18, 62.5, 50, 0);
INSERT INTO order_details VALUES (10634, 51, 53, 15, 0);
INSERT INTO order_details VALUES (10634, 75, 7.75, 2, 0);
INSERT INTO order_details VALUES (10635, 4, 22, 10, 0.100000001);
INSERT INTO order_details VALUES (10635, 5, 21.3500004, 15, 0.100000001);
INSERT INTO order_details VALUES (10635, 22, 21, 40, 0);
INSERT INTO order_details VALUES (10636, 4, 22, 25, 0);
INSERT INTO order_details VALUES (10636, 58, 13.25, 6, 0);
INSERT INTO order_details VALUES (10637, 11, 21, 10, 0);
INSERT INTO order_details VALUES (10637, 50, 16.25, 25, 0.0500000007);
INSERT INTO order_details VALUES (10637, 56, 38, 60, 0.0500000007);
INSERT INTO order_details VALUES (10638, 45, 9.5, 20, 0);
INSERT INTO order_details VALUES (10638, 65, 21.0499992, 21, 0);
INSERT INTO order_details VALUES (10638, 72, 34.7999992, 60, 0);
INSERT INTO order_details VALUES (10639, 18, 62.5, 8, 0);
INSERT INTO order_details VALUES (10640, 69, 36, 20, 0.25);
INSERT INTO order_details VALUES (10640, 70, 15, 15, 0.25);
INSERT INTO order_details VALUES (10641, 2, 19, 50, 0);
INSERT INTO order_details VALUES (10641, 40, 18.3999996, 60, 0);
INSERT INTO order_details VALUES (10642, 21, 10, 30, 0.200000003);
INSERT INTO order_details VALUES (10642, 61, 28.5, 20, 0.200000003);
INSERT INTO order_details VALUES (10643, 28, 45.5999985, 15, 0.25);
INSERT INTO order_details VALUES (10643, 39, 18, 21, 0.25);
INSERT INTO order_details VALUES (10643, 46, 12, 2, 0.25);
INSERT INTO order_details VALUES (10644, 18, 62.5, 4, 0.100000001);
INSERT INTO order_details VALUES (10644, 43, 46, 20, 0);
INSERT INTO order_details VALUES (10644, 46, 12, 21, 0.100000001);
INSERT INTO order_details VALUES (10645, 18, 62.5, 20, 0);
INSERT INTO order_details VALUES (10645, 36, 19, 15, 0);
INSERT INTO order_details VALUES (10646, 1, 18, 15, 0.25);
INSERT INTO order_details VALUES (10646, 10, 31, 18, 0.25);
INSERT INTO order_details VALUES (10646, 71, 21.5, 30, 0.25);
INSERT INTO order_details VALUES (10646, 77, 13, 35, 0.25);
INSERT INTO order_details VALUES (10647, 19, 9.19999981, 30, 0);
INSERT INTO order_details VALUES (10647, 39, 18, 20, 0);
INSERT INTO order_details VALUES (10648, 22, 21, 15, 0);
INSERT INTO order_details VALUES (10648, 24, 4.5, 15, 0.150000006);
INSERT INTO order_details VALUES (10649, 28, 45.5999985, 20, 0);
INSERT INTO order_details VALUES (10649, 72, 34.7999992, 15, 0);
INSERT INTO order_details VALUES (10650, 30, 25.8899994, 30, 0);
INSERT INTO order_details VALUES (10650, 53, 32.7999992, 25, 0.0500000007);
INSERT INTO order_details VALUES (10650, 54, 7.44999981, 30, 0);
INSERT INTO order_details VALUES (10651, 19, 9.19999981, 12, 0.25);
INSERT INTO order_details VALUES (10651, 22, 21, 20, 0.25);
INSERT INTO order_details VALUES (10652, 30, 25.8899994, 2, 0.25);
INSERT INTO order_details VALUES (10652, 42, 14, 20, 0);
INSERT INTO order_details VALUES (10653, 16, 17.4500008, 30, 0.100000001);
INSERT INTO order_details VALUES (10653, 60, 34, 20, 0.100000001);
INSERT INTO order_details VALUES (10654, 4, 22, 12, 0.100000001);
INSERT INTO order_details VALUES (10654, 39, 18, 20, 0.100000001);
INSERT INTO order_details VALUES (10654, 54, 7.44999981, 6, 0.100000001);
INSERT INTO order_details VALUES (10655, 41, 9.64999962, 20, 0.200000003);
INSERT INTO order_details VALUES (10656, 14, 23.25, 3, 0.100000001);
INSERT INTO order_details VALUES (10656, 44, 19.4500008, 28, 0.100000001);
INSERT INTO order_details VALUES (10656, 47, 9.5, 6, 0.100000001);
INSERT INTO order_details VALUES (10657, 15, 15.5, 50, 0);
INSERT INTO order_details VALUES (10657, 41, 9.64999962, 24, 0);
INSERT INTO order_details VALUES (10657, 46, 12, 45, 0);
INSERT INTO order_details VALUES (10657, 47, 9.5, 10, 0);
INSERT INTO order_details VALUES (10657, 56, 38, 45, 0);
INSERT INTO order_details VALUES (10657, 60, 34, 30, 0);
INSERT INTO order_details VALUES (10658, 21, 10, 60, 0);
INSERT INTO order_details VALUES (10658, 40, 18.3999996, 70, 0.0500000007);
INSERT INTO order_details VALUES (10658, 60, 34, 55, 0.0500000007);
INSERT INTO order_details VALUES (10658, 77, 13, 70, 0.0500000007);
INSERT INTO order_details VALUES (10659, 31, 12.5, 20, 0.0500000007);
INSERT INTO order_details VALUES (10659, 40, 18.3999996, 24, 0.0500000007);
INSERT INTO order_details VALUES (10659, 70, 15, 40, 0.0500000007);
INSERT INTO order_details VALUES (10660, 20, 81, 21, 0);
INSERT INTO order_details VALUES (10661, 39, 18, 3, 0.200000003);
INSERT INTO order_details VALUES (10661, 58, 13.25, 49, 0.200000003);
INSERT INTO order_details VALUES (10662, 68, 12.5, 10, 0);
INSERT INTO order_details VALUES (10663, 40, 18.3999996, 30, 0.0500000007);
INSERT INTO order_details VALUES (10663, 42, 14, 30, 0.0500000007);
INSERT INTO order_details VALUES (10663, 51, 53, 20, 0.0500000007);
INSERT INTO order_details VALUES (10664, 10, 31, 24, 0.150000006);
INSERT INTO order_details VALUES (10664, 56, 38, 12, 0.150000006);
INSERT INTO order_details VALUES (10664, 65, 21.0499992, 15, 0.150000006);
INSERT INTO order_details VALUES (10665, 51, 53, 20, 0);
INSERT INTO order_details VALUES (10665, 59, 55, 1, 0);
INSERT INTO order_details VALUES (10665, 76, 18, 10, 0);
INSERT INTO order_details VALUES (10666, 29, 123.790001, 36, 0);
INSERT INTO order_details VALUES (10666, 65, 21.0499992, 10, 0);
INSERT INTO order_details VALUES (10667, 69, 36, 45, 0.200000003);
INSERT INTO order_details VALUES (10667, 71, 21.5, 14, 0.200000003);
INSERT INTO order_details VALUES (10668, 31, 12.5, 8, 0.100000001);
INSERT INTO order_details VALUES (10668, 55, 24, 4, 0.100000001);
INSERT INTO order_details VALUES (10668, 64, 33.25, 15, 0.100000001);
INSERT INTO order_details VALUES (10669, 36, 19, 30, 0);
INSERT INTO order_details VALUES (10670, 23, 9, 32, 0);
INSERT INTO order_details VALUES (10670, 46, 12, 60, 0);
INSERT INTO order_details VALUES (10670, 67, 14, 25, 0);
INSERT INTO order_details VALUES (10670, 73, 15, 50, 0);
INSERT INTO order_details VALUES (10670, 75, 7.75, 25, 0);
INSERT INTO order_details VALUES (10671, 16, 17.4500008, 10, 0);
INSERT INTO order_details VALUES (10671, 62, 49.2999992, 10, 0);
INSERT INTO order_details VALUES (10671, 65, 21.0499992, 12, 0);
INSERT INTO order_details VALUES (10672, 38, 263.5, 15, 0.100000001);
INSERT INTO order_details VALUES (10672, 71, 21.5, 12, 0);
INSERT INTO order_details VALUES (10673, 16, 17.4500008, 3, 0);
INSERT INTO order_details VALUES (10673, 42, 14, 6, 0);
INSERT INTO order_details VALUES (10673, 43, 46, 6, 0);
INSERT INTO order_details VALUES (10674, 23, 9, 5, 0);
INSERT INTO order_details VALUES (10675, 14, 23.25, 30, 0);
INSERT INTO order_details VALUES (10675, 53, 32.7999992, 10, 0);
INSERT INTO order_details VALUES (10675, 58, 13.25, 30, 0);
INSERT INTO order_details VALUES (10676, 10, 31, 2, 0);
INSERT INTO order_details VALUES (10676, 19, 9.19999981, 7, 0);
INSERT INTO order_details VALUES (10676, 44, 19.4500008, 21, 0);
INSERT INTO order_details VALUES (10677, 26, 31.2299995, 30, 0.150000006);
INSERT INTO order_details VALUES (10677, 33, 2.5, 8, 0.150000006);
INSERT INTO order_details VALUES (10678, 12, 38, 100, 0);
INSERT INTO order_details VALUES (10678, 33, 2.5, 30, 0);
INSERT INTO order_details VALUES (10678, 41, 9.64999962, 120, 0);
INSERT INTO order_details VALUES (10678, 54, 7.44999981, 30, 0);
INSERT INTO order_details VALUES (10679, 59, 55, 12, 0);
INSERT INTO order_details VALUES (10680, 16, 17.4500008, 50, 0.25);
INSERT INTO order_details VALUES (10680, 31, 12.5, 20, 0.25);
INSERT INTO order_details VALUES (10680, 42, 14, 40, 0.25);
INSERT INTO order_details VALUES (10681, 19, 9.19999981, 30, 0.100000001);
INSERT INTO order_details VALUES (10681, 21, 10, 12, 0.100000001);
INSERT INTO order_details VALUES (10681, 64, 33.25, 28, 0);
INSERT INTO order_details VALUES (10682, 33, 2.5, 30, 0);
INSERT INTO order_details VALUES (10682, 66, 17, 4, 0);
INSERT INTO order_details VALUES (10682, 75, 7.75, 30, 0);
INSERT INTO order_details VALUES (10683, 52, 7, 9, 0);
INSERT INTO order_details VALUES (10684, 40, 18.3999996, 20, 0);
INSERT INTO order_details VALUES (10684, 47, 9.5, 40, 0);
INSERT INTO order_details VALUES (10684, 60, 34, 30, 0);
INSERT INTO order_details VALUES (10685, 10, 31, 20, 0);
INSERT INTO order_details VALUES (10685, 41, 9.64999962, 4, 0);
INSERT INTO order_details VALUES (10685, 47, 9.5, 15, 0);
INSERT INTO order_details VALUES (10686, 17, 39, 30, 0.200000003);
INSERT INTO order_details VALUES (10686, 26, 31.2299995, 15, 0);
INSERT INTO order_details VALUES (10687, 9, 97, 50, 0.25);
INSERT INTO order_details VALUES (10687, 29, 123.790001, 10, 0);
INSERT INTO order_details VALUES (10687, 36, 19, 6, 0.25);
INSERT INTO order_details VALUES (10688, 10, 31, 18, 0.100000001);
INSERT INTO order_details VALUES (10688, 28, 45.5999985, 60, 0.100000001);
INSERT INTO order_details VALUES (10688, 34, 14, 14, 0);
INSERT INTO order_details VALUES (10689, 1, 18, 35, 0.25);
INSERT INTO order_details VALUES (10690, 56, 38, 20, 0.25);
INSERT INTO order_details VALUES (10690, 77, 13, 30, 0.25);
INSERT INTO order_details VALUES (10691, 1, 18, 30, 0);
INSERT INTO order_details VALUES (10691, 29, 123.790001, 40, 0);
INSERT INTO order_details VALUES (10691, 43, 46, 40, 0);
INSERT INTO order_details VALUES (10691, 44, 19.4500008, 24, 0);
INSERT INTO order_details VALUES (10691, 62, 49.2999992, 48, 0);
INSERT INTO order_details VALUES (10692, 63, 43.9000015, 20, 0);
INSERT INTO order_details VALUES (10693, 9, 97, 6, 0);
INSERT INTO order_details VALUES (10693, 54, 7.44999981, 60, 0.150000006);
INSERT INTO order_details VALUES (10693, 69, 36, 30, 0.150000006);
INSERT INTO order_details VALUES (10693, 73, 15, 15, 0.150000006);
INSERT INTO order_details VALUES (10694, 7, 30, 90, 0);
INSERT INTO order_details VALUES (10694, 59, 55, 25, 0);
INSERT INTO order_details VALUES (10694, 70, 15, 50, 0);
INSERT INTO order_details VALUES (10695, 8, 40, 10, 0);
INSERT INTO order_details VALUES (10695, 12, 38, 4, 0);
INSERT INTO order_details VALUES (10695, 24, 4.5, 20, 0);
INSERT INTO order_details VALUES (10696, 17, 39, 20, 0);
INSERT INTO order_details VALUES (10696, 46, 12, 18, 0);
INSERT INTO order_details VALUES (10697, 19, 9.19999981, 7, 0.25);
INSERT INTO order_details VALUES (10697, 35, 18, 9, 0.25);
INSERT INTO order_details VALUES (10697, 58, 13.25, 30, 0.25);
INSERT INTO order_details VALUES (10697, 70, 15, 30, 0.25);
INSERT INTO order_details VALUES (10698, 11, 21, 15, 0);
INSERT INTO order_details VALUES (10698, 17, 39, 8, 0.0500000007);
INSERT INTO order_details VALUES (10698, 29, 123.790001, 12, 0.0500000007);
INSERT INTO order_details VALUES (10698, 65, 21.0499992, 65, 0.0500000007);
INSERT INTO order_details VALUES (10698, 70, 15, 8, 0.0500000007);
INSERT INTO order_details VALUES (10699, 47, 9.5, 12, 0);
INSERT INTO order_details VALUES (10700, 1, 18, 5, 0.200000003);
INSERT INTO order_details VALUES (10700, 34, 14, 12, 0.200000003);
INSERT INTO order_details VALUES (10700, 68, 12.5, 40, 0.200000003);
INSERT INTO order_details VALUES (10700, 71, 21.5, 60, 0.200000003);
INSERT INTO order_details VALUES (10701, 59, 55, 42, 0.150000006);
INSERT INTO order_details VALUES (10701, 71, 21.5, 20, 0.150000006);
INSERT INTO order_details VALUES (10701, 76, 18, 35, 0.150000006);
INSERT INTO order_details VALUES (10702, 3, 10, 6, 0);
INSERT INTO order_details VALUES (10702, 76, 18, 15, 0);
INSERT INTO order_details VALUES (10703, 2, 19, 5, 0);
INSERT INTO order_details VALUES (10703, 59, 55, 35, 0);
INSERT INTO order_details VALUES (10703, 73, 15, 35, 0);
INSERT INTO order_details VALUES (10704, 4, 22, 6, 0);
INSERT INTO order_details VALUES (10704, 24, 4.5, 35, 0);
INSERT INTO order_details VALUES (10704, 48, 12.75, 24, 0);
INSERT INTO order_details VALUES (10705, 31, 12.5, 20, 0);
INSERT INTO order_details VALUES (10705, 32, 32, 4, 0);
INSERT INTO order_details VALUES (10706, 16, 17.4500008, 20, 0);
INSERT INTO order_details VALUES (10706, 43, 46, 24, 0);
INSERT INTO order_details VALUES (10706, 59, 55, 8, 0);
INSERT INTO order_details VALUES (10707, 55, 24, 21, 0);
INSERT INTO order_details VALUES (10707, 57, 19.5, 40, 0);
INSERT INTO order_details VALUES (10707, 70, 15, 28, 0.150000006);
INSERT INTO order_details VALUES (10708, 5, 21.3500004, 4, 0);
INSERT INTO order_details VALUES (10708, 36, 19, 5, 0);
INSERT INTO order_details VALUES (10709, 8, 40, 40, 0);
INSERT INTO order_details VALUES (10709, 51, 53, 28, 0);
INSERT INTO order_details VALUES (10709, 60, 34, 10, 0);
INSERT INTO order_details VALUES (10710, 19, 9.19999981, 5, 0);
INSERT INTO order_details VALUES (10710, 47, 9.5, 5, 0);
INSERT INTO order_details VALUES (10711, 19, 9.19999981, 12, 0);
INSERT INTO order_details VALUES (10711, 41, 9.64999962, 42, 0);
INSERT INTO order_details VALUES (10711, 53, 32.7999992, 120, 0);
INSERT INTO order_details VALUES (10712, 53, 32.7999992, 3, 0.0500000007);
INSERT INTO order_details VALUES (10712, 56, 38, 30, 0);
INSERT INTO order_details VALUES (10713, 10, 31, 18, 0);
INSERT INTO order_details VALUES (10713, 26, 31.2299995, 30, 0);
INSERT INTO order_details VALUES (10713, 45, 9.5, 110, 0);
INSERT INTO order_details VALUES (10713, 46, 12, 24, 0);
INSERT INTO order_details VALUES (10714, 2, 19, 30, 0.25);
INSERT INTO order_details VALUES (10714, 17, 39, 27, 0.25);
INSERT INTO order_details VALUES (10714, 47, 9.5, 50, 0.25);
INSERT INTO order_details VALUES (10714, 56, 38, 18, 0.25);
INSERT INTO order_details VALUES (10714, 58, 13.25, 12, 0.25);
INSERT INTO order_details VALUES (10715, 10, 31, 21, 0);
INSERT INTO order_details VALUES (10715, 71, 21.5, 30, 0);
INSERT INTO order_details VALUES (10716, 21, 10, 5, 0);
INSERT INTO order_details VALUES (10716, 51, 53, 7, 0);
INSERT INTO order_details VALUES (10716, 61, 28.5, 10, 0);
INSERT INTO order_details VALUES (10717, 21, 10, 32, 0.0500000007);
INSERT INTO order_details VALUES (10717, 54, 7.44999981, 15, 0);
INSERT INTO order_details VALUES (10717, 69, 36, 25, 0.0500000007);
INSERT INTO order_details VALUES (10718, 12, 38, 36, 0);
INSERT INTO order_details VALUES (10718, 16, 17.4500008, 20, 0);
INSERT INTO order_details VALUES (10718, 36, 19, 40, 0);
INSERT INTO order_details VALUES (10718, 62, 49.2999992, 20, 0);
INSERT INTO order_details VALUES (10719, 18, 62.5, 12, 0.25);
INSERT INTO order_details VALUES (10719, 30, 25.8899994, 3, 0.25);
INSERT INTO order_details VALUES (10719, 54, 7.44999981, 40, 0.25);
INSERT INTO order_details VALUES (10720, 35, 18, 21, 0);
INSERT INTO order_details VALUES (10720, 71, 21.5, 8, 0);
INSERT INTO order_details VALUES (10721, 44, 19.4500008, 50, 0.0500000007);
INSERT INTO order_details VALUES (10722, 2, 19, 3, 0);
INSERT INTO order_details VALUES (10722, 31, 12.5, 50, 0);
INSERT INTO order_details VALUES (10722, 68, 12.5, 45, 0);
INSERT INTO order_details VALUES (10722, 75, 7.75, 42, 0);
INSERT INTO order_details VALUES (10723, 26, 31.2299995, 15, 0);
INSERT INTO order_details VALUES (10724, 10, 31, 16, 0);
INSERT INTO order_details VALUES (10724, 61, 28.5, 5, 0);
INSERT INTO order_details VALUES (10725, 41, 9.64999962, 12, 0);
INSERT INTO order_details VALUES (10725, 52, 7, 4, 0);
INSERT INTO order_details VALUES (10725, 55, 24, 6, 0);
INSERT INTO order_details VALUES (10726, 4, 22, 25, 0);
INSERT INTO order_details VALUES (10726, 11, 21, 5, 0);
INSERT INTO order_details VALUES (10727, 17, 39, 20, 0.0500000007);
INSERT INTO order_details VALUES (10727, 56, 38, 10, 0.0500000007);
INSERT INTO order_details VALUES (10727, 59, 55, 10, 0.0500000007);
INSERT INTO order_details VALUES (10728, 30, 25.8899994, 15, 0);
INSERT INTO order_details VALUES (10728, 40, 18.3999996, 6, 0);
INSERT INTO order_details VALUES (10728, 55, 24, 12, 0);
INSERT INTO order_details VALUES (10728, 60, 34, 15, 0);
INSERT INTO order_details VALUES (10729, 1, 18, 50, 0);
INSERT INTO order_details VALUES (10729, 21, 10, 30, 0);
INSERT INTO order_details VALUES (10729, 50, 16.25, 40, 0);
INSERT INTO order_details VALUES (10730, 16, 17.4500008, 15, 0.0500000007);
INSERT INTO order_details VALUES (10730, 31, 12.5, 3, 0.0500000007);
INSERT INTO order_details VALUES (10730, 65, 21.0499992, 10, 0.0500000007);
INSERT INTO order_details VALUES (10731, 21, 10, 40, 0.0500000007);
INSERT INTO order_details VALUES (10731, 51, 53, 30, 0.0500000007);
INSERT INTO order_details VALUES (10732, 76, 18, 20, 0);
INSERT INTO order_details VALUES (10733, 14, 23.25, 16, 0);
INSERT INTO order_details VALUES (10733, 28, 45.5999985, 20, 0);
INSERT INTO order_details VALUES (10733, 52, 7, 25, 0);
INSERT INTO order_details VALUES (10734, 6, 25, 30, 0);
INSERT INTO order_details VALUES (10734, 30, 25.8899994, 15, 0);
INSERT INTO order_details VALUES (10734, 76, 18, 20, 0);
INSERT INTO order_details VALUES (10735, 61, 28.5, 20, 0.100000001);
INSERT INTO order_details VALUES (10735, 77, 13, 2, 0.100000001);
INSERT INTO order_details VALUES (10736, 65, 21.0499992, 40, 0);
INSERT INTO order_details VALUES (10736, 75, 7.75, 20, 0);
INSERT INTO order_details VALUES (10737, 13, 6, 4, 0);
INSERT INTO order_details VALUES (10737, 41, 9.64999962, 12, 0);
INSERT INTO order_details VALUES (10738, 16, 17.4500008, 3, 0);
INSERT INTO order_details VALUES (10739, 36, 19, 6, 0);
INSERT INTO order_details VALUES (10739, 52, 7, 18, 0);
INSERT INTO order_details VALUES (10740, 28, 45.5999985, 5, 0.200000003);
INSERT INTO order_details VALUES (10740, 35, 18, 35, 0.200000003);
INSERT INTO order_details VALUES (10740, 45, 9.5, 40, 0.200000003);
INSERT INTO order_details VALUES (10740, 56, 38, 14, 0.200000003);
INSERT INTO order_details VALUES (10741, 2, 19, 15, 0.200000003);
INSERT INTO order_details VALUES (10742, 3, 10, 20, 0);
INSERT INTO order_details VALUES (10742, 60, 34, 50, 0);
INSERT INTO order_details VALUES (10742, 72, 34.7999992, 35, 0);
INSERT INTO order_details VALUES (10743, 46, 12, 28, 0.0500000007);
INSERT INTO order_details VALUES (10744, 40, 18.3999996, 50, 0.200000003);
INSERT INTO order_details VALUES (10745, 18, 62.5, 24, 0);
INSERT INTO order_details VALUES (10745, 44, 19.4500008, 16, 0);
INSERT INTO order_details VALUES (10745, 59, 55, 45, 0);
INSERT INTO order_details VALUES (10745, 72, 34.7999992, 7, 0);
INSERT INTO order_details VALUES (10746, 13, 6, 6, 0);
INSERT INTO order_details VALUES (10746, 42, 14, 28, 0);
INSERT INTO order_details VALUES (10746, 62, 49.2999992, 9, 0);
INSERT INTO order_details VALUES (10746, 69, 36, 40, 0);
INSERT INTO order_details VALUES (10747, 31, 12.5, 8, 0);
INSERT INTO order_details VALUES (10747, 41, 9.64999962, 35, 0);
INSERT INTO order_details VALUES (10747, 63, 43.9000015, 9, 0);
INSERT INTO order_details VALUES (10747, 69, 36, 30, 0);
INSERT INTO order_details VALUES (10748, 23, 9, 44, 0);
INSERT INTO order_details VALUES (10748, 40, 18.3999996, 40, 0);
INSERT INTO order_details VALUES (10748, 56, 38, 28, 0);
INSERT INTO order_details VALUES (10749, 56, 38, 15, 0);
INSERT INTO order_details VALUES (10749, 59, 55, 6, 0);
INSERT INTO order_details VALUES (10749, 76, 18, 10, 0);
INSERT INTO order_details VALUES (10750, 14, 23.25, 5, 0.150000006);
INSERT INTO order_details VALUES (10750, 45, 9.5, 40, 0.150000006);
INSERT INTO order_details VALUES (10750, 59, 55, 25, 0.150000006);
INSERT INTO order_details VALUES (10751, 26, 31.2299995, 12, 0.100000001);
INSERT INTO order_details VALUES (10751, 30, 25.8899994, 30, 0);
INSERT INTO order_details VALUES (10751, 50, 16.25, 20, 0.100000001);
INSERT INTO order_details VALUES (10751, 73, 15, 15, 0);
INSERT INTO order_details VALUES (10752, 1, 18, 8, 0);
INSERT INTO order_details VALUES (10752, 69, 36, 3, 0);
INSERT INTO order_details VALUES (10753, 45, 9.5, 4, 0);
INSERT INTO order_details VALUES (10753, 74, 10, 5, 0);
INSERT INTO order_details VALUES (10754, 40, 18.3999996, 3, 0);
INSERT INTO order_details VALUES (10755, 47, 9.5, 30, 0.25);
INSERT INTO order_details VALUES (10755, 56, 38, 30, 0.25);
INSERT INTO order_details VALUES (10755, 57, 19.5, 14, 0.25);
INSERT INTO order_details VALUES (10755, 69, 36, 25, 0.25);
INSERT INTO order_details VALUES (10756, 18, 62.5, 21, 0.200000003);
INSERT INTO order_details VALUES (10756, 36, 19, 20, 0.200000003);
INSERT INTO order_details VALUES (10756, 68, 12.5, 6, 0.200000003);
INSERT INTO order_details VALUES (10756, 69, 36, 20, 0.200000003);
INSERT INTO order_details VALUES (10757, 34, 14, 30, 0);
INSERT INTO order_details VALUES (10757, 59, 55, 7, 0);
INSERT INTO order_details VALUES (10757, 62, 49.2999992, 30, 0);
INSERT INTO order_details VALUES (10757, 64, 33.25, 24, 0);
INSERT INTO order_details VALUES (10758, 26, 31.2299995, 20, 0);
INSERT INTO order_details VALUES (10758, 52, 7, 60, 0);
INSERT INTO order_details VALUES (10758, 70, 15, 40, 0);
INSERT INTO order_details VALUES (10759, 32, 32, 10, 0);
INSERT INTO order_details VALUES (10760, 25, 14, 12, 0.25);
INSERT INTO order_details VALUES (10760, 27, 43.9000015, 40, 0);
INSERT INTO order_details VALUES (10760, 43, 46, 30, 0.25);
INSERT INTO order_details VALUES (10761, 25, 14, 35, 0.25);
INSERT INTO order_details VALUES (10761, 75, 7.75, 18, 0);
INSERT INTO order_details VALUES (10762, 39, 18, 16, 0);
INSERT INTO order_details VALUES (10762, 47, 9.5, 30, 0);
INSERT INTO order_details VALUES (10762, 51, 53, 28, 0);
INSERT INTO order_details VALUES (10762, 56, 38, 60, 0);
INSERT INTO order_details VALUES (10763, 21, 10, 40, 0);
INSERT INTO order_details VALUES (10763, 22, 21, 6, 0);
INSERT INTO order_details VALUES (10763, 24, 4.5, 20, 0);
INSERT INTO order_details VALUES (10764, 3, 10, 20, 0.100000001);
INSERT INTO order_details VALUES (10764, 39, 18, 130, 0.100000001);
INSERT INTO order_details VALUES (10765, 65, 21.0499992, 80, 0.100000001);
INSERT INTO order_details VALUES (10766, 2, 19, 40, 0);
INSERT INTO order_details VALUES (10766, 7, 30, 35, 0);
INSERT INTO order_details VALUES (10766, 68, 12.5, 40, 0);
INSERT INTO order_details VALUES (10767, 42, 14, 2, 0);
INSERT INTO order_details VALUES (10768, 22, 21, 4, 0);
INSERT INTO order_details VALUES (10768, 31, 12.5, 50, 0);
INSERT INTO order_details VALUES (10768, 60, 34, 15, 0);
INSERT INTO order_details VALUES (10768, 71, 21.5, 12, 0);
INSERT INTO order_details VALUES (10769, 41, 9.64999962, 30, 0.0500000007);
INSERT INTO order_details VALUES (10769, 52, 7, 15, 0.0500000007);
INSERT INTO order_details VALUES (10769, 61, 28.5, 20, 0);
INSERT INTO order_details VALUES (10769, 62, 49.2999992, 15, 0);
INSERT INTO order_details VALUES (10770, 11, 21, 15, 0.25);
INSERT INTO order_details VALUES (10771, 71, 21.5, 16, 0);
INSERT INTO order_details VALUES (10772, 29, 123.790001, 18, 0);
INSERT INTO order_details VALUES (10772, 59, 55, 25, 0);
INSERT INTO order_details VALUES (10773, 17, 39, 33, 0);
INSERT INTO order_details VALUES (10773, 31, 12.5, 70, 0.200000003);
INSERT INTO order_details VALUES (10773, 75, 7.75, 7, 0.200000003);
INSERT INTO order_details VALUES (10774, 31, 12.5, 2, 0.25);
INSERT INTO order_details VALUES (10774, 66, 17, 50, 0);
INSERT INTO order_details VALUES (10775, 10, 31, 6, 0);
INSERT INTO order_details VALUES (10775, 67, 14, 3, 0);
INSERT INTO order_details VALUES (10776, 31, 12.5, 16, 0.0500000007);
INSERT INTO order_details VALUES (10776, 42, 14, 12, 0.0500000007);
INSERT INTO order_details VALUES (10776, 45, 9.5, 27, 0.0500000007);
INSERT INTO order_details VALUES (10776, 51, 53, 120, 0.0500000007);
INSERT INTO order_details VALUES (10777, 42, 14, 20, 0.200000003);
INSERT INTO order_details VALUES (10778, 41, 9.64999962, 10, 0);
INSERT INTO order_details VALUES (10779, 16, 17.4500008, 20, 0);
INSERT INTO order_details VALUES (10779, 62, 49.2999992, 20, 0);
INSERT INTO order_details VALUES (10780, 70, 15, 35, 0);
INSERT INTO order_details VALUES (10780, 77, 13, 15, 0);
INSERT INTO order_details VALUES (10781, 54, 7.44999981, 3, 0.200000003);
INSERT INTO order_details VALUES (10781, 56, 38, 20, 0.200000003);
INSERT INTO order_details VALUES (10781, 74, 10, 35, 0);
INSERT INTO order_details VALUES (10782, 31, 12.5, 1, 0);
INSERT INTO order_details VALUES (10783, 31, 12.5, 10, 0);
INSERT INTO order_details VALUES (10783, 38, 263.5, 5, 0);
INSERT INTO order_details VALUES (10784, 36, 19, 30, 0);
INSERT INTO order_details VALUES (10784, 39, 18, 2, 0.150000006);
INSERT INTO order_details VALUES (10784, 72, 34.7999992, 30, 0.150000006);
INSERT INTO order_details VALUES (10785, 10, 31, 10, 0);
INSERT INTO order_details VALUES (10785, 75, 7.75, 10, 0);
INSERT INTO order_details VALUES (10786, 8, 40, 30, 0.200000003);
INSERT INTO order_details VALUES (10786, 30, 25.8899994, 15, 0.200000003);
INSERT INTO order_details VALUES (10786, 75, 7.75, 42, 0.200000003);
INSERT INTO order_details VALUES (10787, 2, 19, 15, 0.0500000007);
INSERT INTO order_details VALUES (10787, 29, 123.790001, 20, 0.0500000007);
INSERT INTO order_details VALUES (10788, 19, 9.19999981, 50, 0.0500000007);
INSERT INTO order_details VALUES (10788, 75, 7.75, 40, 0.0500000007);
INSERT INTO order_details VALUES (10789, 18, 62.5, 30, 0);
INSERT INTO order_details VALUES (10789, 35, 18, 15, 0);
INSERT INTO order_details VALUES (10789, 63, 43.9000015, 30, 0);
INSERT INTO order_details VALUES (10789, 68, 12.5, 18, 0);
INSERT INTO order_details VALUES (10790, 7, 30, 3, 0.150000006);
INSERT INTO order_details VALUES (10790, 56, 38, 20, 0.150000006);
INSERT INTO order_details VALUES (10791, 29, 123.790001, 14, 0.0500000007);
INSERT INTO order_details VALUES (10791, 41, 9.64999962, 20, 0.0500000007);
INSERT INTO order_details VALUES (10792, 2, 19, 10, 0);
INSERT INTO order_details VALUES (10792, 54, 7.44999981, 3, 0);
INSERT INTO order_details VALUES (10792, 68, 12.5, 15, 0);
INSERT INTO order_details VALUES (10793, 41, 9.64999962, 14, 0);
INSERT INTO order_details VALUES (10793, 52, 7, 8, 0);
INSERT INTO order_details VALUES (10794, 14, 23.25, 15, 0.200000003);
INSERT INTO order_details VALUES (10794, 54, 7.44999981, 6, 0.200000003);
INSERT INTO order_details VALUES (10795, 16, 17.4500008, 65, 0);
INSERT INTO order_details VALUES (10795, 17, 39, 35, 0.25);
INSERT INTO order_details VALUES (10796, 26, 31.2299995, 21, 0.200000003);
INSERT INTO order_details VALUES (10796, 44, 19.4500008, 10, 0);
INSERT INTO order_details VALUES (10796, 64, 33.25, 35, 0.200000003);
INSERT INTO order_details VALUES (10796, 69, 36, 24, 0.200000003);
INSERT INTO order_details VALUES (10797, 11, 21, 20, 0);
INSERT INTO order_details VALUES (10798, 62, 49.2999992, 2, 0);
INSERT INTO order_details VALUES (10798, 72, 34.7999992, 10, 0);
INSERT INTO order_details VALUES (10799, 13, 6, 20, 0.150000006);
INSERT INTO order_details VALUES (10799, 24, 4.5, 20, 0.150000006);
INSERT INTO order_details VALUES (10799, 59, 55, 25, 0);
INSERT INTO order_details VALUES (10800, 11, 21, 50, 0.100000001);
INSERT INTO order_details VALUES (10800, 51, 53, 10, 0.100000001);
INSERT INTO order_details VALUES (10800, 54, 7.44999981, 7, 0.100000001);
INSERT INTO order_details VALUES (10801, 17, 39, 40, 0.25);
INSERT INTO order_details VALUES (10801, 29, 123.790001, 20, 0.25);
INSERT INTO order_details VALUES (10802, 30, 25.8899994, 25, 0.25);
INSERT INTO order_details VALUES (10802, 51, 53, 30, 0.25);
INSERT INTO order_details VALUES (10802, 55, 24, 60, 0.25);
INSERT INTO order_details VALUES (10802, 62, 49.2999992, 5, 0.25);
INSERT INTO order_details VALUES (10803, 19, 9.19999981, 24, 0.0500000007);
INSERT INTO order_details VALUES (10803, 25, 14, 15, 0.0500000007);
INSERT INTO order_details VALUES (10803, 59, 55, 15, 0.0500000007);
INSERT INTO order_details VALUES (10804, 10, 31, 36, 0);
INSERT INTO order_details VALUES (10804, 28, 45.5999985, 24, 0);
INSERT INTO order_details VALUES (10804, 49, 20, 4, 0.150000006);
INSERT INTO order_details VALUES (10805, 34, 14, 10, 0);
INSERT INTO order_details VALUES (10805, 38, 263.5, 10, 0);
INSERT INTO order_details VALUES (10806, 2, 19, 20, 0.25);
INSERT INTO order_details VALUES (10806, 65, 21.0499992, 2, 0);
INSERT INTO order_details VALUES (10806, 74, 10, 15, 0.25);
INSERT INTO order_details VALUES (10807, 40, 18.3999996, 1, 0);
INSERT INTO order_details VALUES (10808, 56, 38, 20, 0.150000006);
INSERT INTO order_details VALUES (10808, 76, 18, 50, 0.150000006);
INSERT INTO order_details VALUES (10809, 52, 7, 20, 0);
INSERT INTO order_details VALUES (10810, 13, 6, 7, 0);
INSERT INTO order_details VALUES (10810, 25, 14, 5, 0);
INSERT INTO order_details VALUES (10810, 70, 15, 5, 0);
INSERT INTO order_details VALUES (10811, 19, 9.19999981, 15, 0);
INSERT INTO order_details VALUES (10811, 23, 9, 18, 0);
INSERT INTO order_details VALUES (10811, 40, 18.3999996, 30, 0);
INSERT INTO order_details VALUES (10812, 31, 12.5, 16, 0.100000001);
INSERT INTO order_details VALUES (10812, 72, 34.7999992, 40, 0.100000001);
INSERT INTO order_details VALUES (10812, 77, 13, 20, 0);
INSERT INTO order_details VALUES (10813, 2, 19, 12, 0.200000003);
INSERT INTO order_details VALUES (10813, 46, 12, 35, 0);
INSERT INTO order_details VALUES (10814, 41, 9.64999962, 20, 0);
INSERT INTO order_details VALUES (10814, 43, 46, 20, 0.150000006);
INSERT INTO order_details VALUES (10814, 48, 12.75, 8, 0.150000006);
INSERT INTO order_details VALUES (10814, 61, 28.5, 30, 0.150000006);
INSERT INTO order_details VALUES (10815, 33, 2.5, 16, 0);
INSERT INTO order_details VALUES (10816, 38, 263.5, 30, 0.0500000007);
INSERT INTO order_details VALUES (10816, 62, 49.2999992, 20, 0.0500000007);
INSERT INTO order_details VALUES (10817, 26, 31.2299995, 40, 0.150000006);
INSERT INTO order_details VALUES (10817, 38, 263.5, 30, 0);
INSERT INTO order_details VALUES (10817, 40, 18.3999996, 60, 0.150000006);
INSERT INTO order_details VALUES (10817, 62, 49.2999992, 25, 0.150000006);
INSERT INTO order_details VALUES (10818, 32, 32, 20, 0);
INSERT INTO order_details VALUES (10818, 41, 9.64999962, 20, 0);
INSERT INTO order_details VALUES (10819, 43, 46, 7, 0);
INSERT INTO order_details VALUES (10819, 75, 7.75, 20, 0);
INSERT INTO order_details VALUES (10820, 56, 38, 30, 0);
INSERT INTO order_details VALUES (10821, 35, 18, 20, 0);
INSERT INTO order_details VALUES (10821, 51, 53, 6, 0);
INSERT INTO order_details VALUES (10822, 62, 49.2999992, 3, 0);
INSERT INTO order_details VALUES (10822, 70, 15, 6, 0);
INSERT INTO order_details VALUES (10823, 11, 21, 20, 0.100000001);
INSERT INTO order_details VALUES (10823, 57, 19.5, 15, 0);
INSERT INTO order_details VALUES (10823, 59, 55, 40, 0.100000001);
INSERT INTO order_details VALUES (10823, 77, 13, 15, 0.100000001);
INSERT INTO order_details VALUES (10824, 41, 9.64999962, 12, 0);
INSERT INTO order_details VALUES (10824, 70, 15, 9, 0);
INSERT INTO order_details VALUES (10825, 26, 31.2299995, 12, 0);
INSERT INTO order_details VALUES (10825, 53, 32.7999992, 20, 0);
INSERT INTO order_details VALUES (10826, 31, 12.5, 35, 0);
INSERT INTO order_details VALUES (10826, 57, 19.5, 15, 0);
INSERT INTO order_details VALUES (10827, 10, 31, 15, 0);
INSERT INTO order_details VALUES (10827, 39, 18, 21, 0);
INSERT INTO order_details VALUES (10828, 20, 81, 5, 0);
INSERT INTO order_details VALUES (10828, 38, 263.5, 2, 0);
INSERT INTO order_details VALUES (10829, 2, 19, 10, 0);
INSERT INTO order_details VALUES (10829, 8, 40, 20, 0);
INSERT INTO order_details VALUES (10829, 13, 6, 10, 0);
INSERT INTO order_details VALUES (10829, 60, 34, 21, 0);
INSERT INTO order_details VALUES (10830, 6, 25, 6, 0);
INSERT INTO order_details VALUES (10830, 39, 18, 28, 0);
INSERT INTO order_details VALUES (10830, 60, 34, 30, 0);
INSERT INTO order_details VALUES (10830, 68, 12.5, 24, 0);
INSERT INTO order_details VALUES (10831, 19, 9.19999981, 2, 0);
INSERT INTO order_details VALUES (10831, 35, 18, 8, 0);
INSERT INTO order_details VALUES (10831, 38, 263.5, 8, 0);
INSERT INTO order_details VALUES (10831, 43, 46, 9, 0);
INSERT INTO order_details VALUES (10832, 13, 6, 3, 0.200000003);
INSERT INTO order_details VALUES (10832, 25, 14, 10, 0.200000003);
INSERT INTO order_details VALUES (10832, 44, 19.4500008, 16, 0.200000003);
INSERT INTO order_details VALUES (10832, 64, 33.25, 3, 0);
INSERT INTO order_details VALUES (10833, 7, 30, 20, 0.100000001);
INSERT INTO order_details VALUES (10833, 31, 12.5, 9, 0.100000001);
INSERT INTO order_details VALUES (10833, 53, 32.7999992, 9, 0.100000001);
INSERT INTO order_details VALUES (10834, 29, 123.790001, 8, 0.0500000007);
INSERT INTO order_details VALUES (10834, 30, 25.8899994, 20, 0.0500000007);
INSERT INTO order_details VALUES (10835, 59, 55, 15, 0);
INSERT INTO order_details VALUES (10835, 77, 13, 2, 0.200000003);
INSERT INTO order_details VALUES (10836, 22, 21, 52, 0);
INSERT INTO order_details VALUES (10836, 35, 18, 6, 0);
INSERT INTO order_details VALUES (10836, 57, 19.5, 24, 0);
INSERT INTO order_details VALUES (10836, 60, 34, 60, 0);
INSERT INTO order_details VALUES (10836, 64, 33.25, 30, 0);
INSERT INTO order_details VALUES (10837, 13, 6, 6, 0);
INSERT INTO order_details VALUES (10837, 40, 18.3999996, 25, 0);
INSERT INTO order_details VALUES (10837, 47, 9.5, 40, 0.25);
INSERT INTO order_details VALUES (10837, 76, 18, 21, 0.25);
INSERT INTO order_details VALUES (10838, 1, 18, 4, 0.25);
INSERT INTO order_details VALUES (10838, 18, 62.5, 25, 0.25);
INSERT INTO order_details VALUES (10838, 36, 19, 50, 0.25);
INSERT INTO order_details VALUES (10839, 58, 13.25, 30, 0.100000001);
INSERT INTO order_details VALUES (10839, 72, 34.7999992, 15, 0.100000001);
INSERT INTO order_details VALUES (10840, 25, 14, 6, 0.200000003);
INSERT INTO order_details VALUES (10840, 39, 18, 10, 0.200000003);
INSERT INTO order_details VALUES (10841, 10, 31, 16, 0);
INSERT INTO order_details VALUES (10841, 56, 38, 30, 0);
INSERT INTO order_details VALUES (10841, 59, 55, 50, 0);
INSERT INTO order_details VALUES (10841, 77, 13, 15, 0);
INSERT INTO order_details VALUES (10842, 11, 21, 15, 0);
INSERT INTO order_details VALUES (10842, 43, 46, 5, 0);
INSERT INTO order_details VALUES (10842, 68, 12.5, 20, 0);
INSERT INTO order_details VALUES (10842, 70, 15, 12, 0);
INSERT INTO order_details VALUES (10843, 51, 53, 4, 0.25);
INSERT INTO order_details VALUES (10844, 22, 21, 35, 0);
INSERT INTO order_details VALUES (10845, 23, 9, 70, 0.100000001);
INSERT INTO order_details VALUES (10845, 35, 18, 25, 0.100000001);
INSERT INTO order_details VALUES (10845, 42, 14, 42, 0.100000001);
INSERT INTO order_details VALUES (10845, 58, 13.25, 60, 0.100000001);
INSERT INTO order_details VALUES (10845, 64, 33.25, 48, 0);
INSERT INTO order_details VALUES (10846, 4, 22, 21, 0);
INSERT INTO order_details VALUES (10846, 70, 15, 30, 0);
INSERT INTO order_details VALUES (10846, 74, 10, 20, 0);
INSERT INTO order_details VALUES (10847, 1, 18, 80, 0.200000003);
INSERT INTO order_details VALUES (10847, 19, 9.19999981, 12, 0.200000003);
INSERT INTO order_details VALUES (10847, 37, 26, 60, 0.200000003);
INSERT INTO order_details VALUES (10847, 45, 9.5, 36, 0.200000003);
INSERT INTO order_details VALUES (10847, 60, 34, 45, 0.200000003);
INSERT INTO order_details VALUES (10847, 71, 21.5, 55, 0.200000003);
INSERT INTO order_details VALUES (10848, 5, 21.3500004, 30, 0);
INSERT INTO order_details VALUES (10848, 9, 97, 3, 0);
INSERT INTO order_details VALUES (10849, 3, 10, 49, 0);
INSERT INTO order_details VALUES (10849, 26, 31.2299995, 18, 0.150000006);
INSERT INTO order_details VALUES (10850, 25, 14, 20, 0.150000006);
INSERT INTO order_details VALUES (10850, 33, 2.5, 4, 0.150000006);
INSERT INTO order_details VALUES (10850, 70, 15, 30, 0.150000006);
INSERT INTO order_details VALUES (10851, 2, 19, 5, 0.0500000007);
INSERT INTO order_details VALUES (10851, 25, 14, 10, 0.0500000007);
INSERT INTO order_details VALUES (10851, 57, 19.5, 10, 0.0500000007);
INSERT INTO order_details VALUES (10851, 59, 55, 42, 0.0500000007);
INSERT INTO order_details VALUES (10852, 2, 19, 15, 0);
INSERT INTO order_details VALUES (10852, 17, 39, 6, 0);
INSERT INTO order_details VALUES (10852, 62, 49.2999992, 50, 0);
INSERT INTO order_details VALUES (10853, 18, 62.5, 10, 0);
INSERT INTO order_details VALUES (10854, 10, 31, 100, 0.150000006);
INSERT INTO order_details VALUES (10854, 13, 6, 65, 0.150000006);
INSERT INTO order_details VALUES (10855, 16, 17.4500008, 50, 0);
INSERT INTO order_details VALUES (10855, 31, 12.5, 14, 0);
INSERT INTO order_details VALUES (10855, 56, 38, 24, 0);
INSERT INTO order_details VALUES (10855, 65, 21.0499992, 15, 0.150000006);
INSERT INTO order_details VALUES (10856, 2, 19, 20, 0);
INSERT INTO order_details VALUES (10856, 42, 14, 20, 0);
INSERT INTO order_details VALUES (10857, 3, 10, 30, 0);
INSERT INTO order_details VALUES (10857, 26, 31.2299995, 35, 0.25);
INSERT INTO order_details VALUES (10857, 29, 123.790001, 10, 0.25);
INSERT INTO order_details VALUES (10858, 7, 30, 5, 0);
INSERT INTO order_details VALUES (10858, 27, 43.9000015, 10, 0);
INSERT INTO order_details VALUES (10858, 70, 15, 4, 0);
INSERT INTO order_details VALUES (10859, 24, 4.5, 40, 0.25);
INSERT INTO order_details VALUES (10859, 54, 7.44999981, 35, 0.25);
INSERT INTO order_details VALUES (10859, 64, 33.25, 30, 0.25);
INSERT INTO order_details VALUES (10860, 51, 53, 3, 0);
INSERT INTO order_details VALUES (10860, 76, 18, 20, 0);
INSERT INTO order_details VALUES (10861, 17, 39, 42, 0);
INSERT INTO order_details VALUES (10861, 18, 62.5, 20, 0);
INSERT INTO order_details VALUES (10861, 21, 10, 40, 0);
INSERT INTO order_details VALUES (10861, 33, 2.5, 35, 0);
INSERT INTO order_details VALUES (10861, 62, 49.2999992, 3, 0);
INSERT INTO order_details VALUES (10862, 11, 21, 25, 0);
INSERT INTO order_details VALUES (10862, 52, 7, 8, 0);
INSERT INTO order_details VALUES (10863, 1, 18, 20, 0.150000006);
INSERT INTO order_details VALUES (10863, 58, 13.25, 12, 0.150000006);
INSERT INTO order_details VALUES (10864, 35, 18, 4, 0);
INSERT INTO order_details VALUES (10864, 67, 14, 15, 0);
INSERT INTO order_details VALUES (10865, 38, 263.5, 60, 0.0500000007);
INSERT INTO order_details VALUES (10865, 39, 18, 80, 0.0500000007);
INSERT INTO order_details VALUES (10866, 2, 19, 21, 0.25);
INSERT INTO order_details VALUES (10866, 24, 4.5, 6, 0.25);
INSERT INTO order_details VALUES (10866, 30, 25.8899994, 40, 0.25);
INSERT INTO order_details VALUES (10867, 53, 32.7999992, 3, 0);
INSERT INTO order_details VALUES (10868, 26, 31.2299995, 20, 0);
INSERT INTO order_details VALUES (10868, 35, 18, 30, 0);
INSERT INTO order_details VALUES (10868, 49, 20, 42, 0.100000001);
INSERT INTO order_details VALUES (10869, 1, 18, 40, 0);
INSERT INTO order_details VALUES (10869, 11, 21, 10, 0);
INSERT INTO order_details VALUES (10869, 23, 9, 50, 0);
INSERT INTO order_details VALUES (10869, 68, 12.5, 20, 0);
INSERT INTO order_details VALUES (10870, 35, 18, 3, 0);
INSERT INTO order_details VALUES (10870, 51, 53, 2, 0);
INSERT INTO order_details VALUES (10871, 6, 25, 50, 0.0500000007);
INSERT INTO order_details VALUES (10871, 16, 17.4500008, 12, 0.0500000007);
INSERT INTO order_details VALUES (10871, 17, 39, 16, 0.0500000007);
INSERT INTO order_details VALUES (10872, 55, 24, 10, 0.0500000007);
INSERT INTO order_details VALUES (10872, 62, 49.2999992, 20, 0.0500000007);
INSERT INTO order_details VALUES (10872, 64, 33.25, 15, 0.0500000007);
INSERT INTO order_details VALUES (10872, 65, 21.0499992, 21, 0.0500000007);
INSERT INTO order_details VALUES (10873, 21, 10, 20, 0);
INSERT INTO order_details VALUES (10873, 28, 45.5999985, 3, 0);
INSERT INTO order_details VALUES (10874, 10, 31, 10, 0);
INSERT INTO order_details VALUES (10875, 19, 9.19999981, 25, 0);
INSERT INTO order_details VALUES (10875, 47, 9.5, 21, 0.100000001);
INSERT INTO order_details VALUES (10875, 49, 20, 15, 0);
INSERT INTO order_details VALUES (10876, 46, 12, 21, 0);
INSERT INTO order_details VALUES (10876, 64, 33.25, 20, 0);
INSERT INTO order_details VALUES (10877, 16, 17.4500008, 30, 0.25);
INSERT INTO order_details VALUES (10877, 18, 62.5, 25, 0);
INSERT INTO order_details VALUES (10878, 20, 81, 20, 0.0500000007);
INSERT INTO order_details VALUES (10879, 40, 18.3999996, 12, 0);
INSERT INTO order_details VALUES (10879, 65, 21.0499992, 10, 0);
INSERT INTO order_details VALUES (10879, 76, 18, 10, 0);
INSERT INTO order_details VALUES (10880, 23, 9, 30, 0.200000003);
INSERT INTO order_details VALUES (10880, 61, 28.5, 30, 0.200000003);
INSERT INTO order_details VALUES (10880, 70, 15, 50, 0.200000003);
INSERT INTO order_details VALUES (10881, 73, 15, 10, 0);
INSERT INTO order_details VALUES (10882, 42, 14, 25, 0);
INSERT INTO order_details VALUES (10882, 49, 20, 20, 0.150000006);
INSERT INTO order_details VALUES (10882, 54, 7.44999981, 32, 0.150000006);
INSERT INTO order_details VALUES (10883, 24, 4.5, 8, 0);
INSERT INTO order_details VALUES (10884, 21, 10, 40, 0.0500000007);
INSERT INTO order_details VALUES (10884, 56, 38, 21, 0.0500000007);
INSERT INTO order_details VALUES (10884, 65, 21.0499992, 12, 0.0500000007);
INSERT INTO order_details VALUES (10885, 2, 19, 20, 0);
INSERT INTO order_details VALUES (10885, 24, 4.5, 12, 0);
INSERT INTO order_details VALUES (10885, 70, 15, 30, 0);
INSERT INTO order_details VALUES (10885, 77, 13, 25, 0);
INSERT INTO order_details VALUES (10886, 10, 31, 70, 0);
INSERT INTO order_details VALUES (10886, 31, 12.5, 35, 0);
INSERT INTO order_details VALUES (10886, 77, 13, 40, 0);
INSERT INTO order_details VALUES (10887, 25, 14, 5, 0);
INSERT INTO order_details VALUES (10888, 2, 19, 20, 0);
INSERT INTO order_details VALUES (10888, 68, 12.5, 18, 0);
INSERT INTO order_details VALUES (10889, 11, 21, 40, 0);
INSERT INTO order_details VALUES (10889, 38, 263.5, 40, 0);
INSERT INTO order_details VALUES (10890, 17, 39, 15, 0);
INSERT INTO order_details VALUES (10890, 34, 14, 10, 0);
INSERT INTO order_details VALUES (10890, 41, 9.64999962, 14, 0);
INSERT INTO order_details VALUES (10891, 30, 25.8899994, 15, 0.0500000007);
INSERT INTO order_details VALUES (10892, 59, 55, 40, 0.0500000007);
INSERT INTO order_details VALUES (10893, 8, 40, 30, 0);
INSERT INTO order_details VALUES (10893, 24, 4.5, 10, 0);
INSERT INTO order_details VALUES (10893, 29, 123.790001, 24, 0);
INSERT INTO order_details VALUES (10893, 30, 25.8899994, 35, 0);
INSERT INTO order_details VALUES (10893, 36, 19, 20, 0);
INSERT INTO order_details VALUES (10894, 13, 6, 28, 0.0500000007);
INSERT INTO order_details VALUES (10894, 69, 36, 50, 0.0500000007);
INSERT INTO order_details VALUES (10894, 75, 7.75, 120, 0.0500000007);
INSERT INTO order_details VALUES (10895, 24, 4.5, 110, 0);
INSERT INTO order_details VALUES (10895, 39, 18, 45, 0);
INSERT INTO order_details VALUES (10895, 40, 18.3999996, 91, 0);
INSERT INTO order_details VALUES (10895, 60, 34, 100, 0);
INSERT INTO order_details VALUES (10896, 45, 9.5, 15, 0);
INSERT INTO order_details VALUES (10896, 56, 38, 16, 0);
INSERT INTO order_details VALUES (10897, 29, 123.790001, 80, 0);
INSERT INTO order_details VALUES (10897, 30, 25.8899994, 36, 0);
INSERT INTO order_details VALUES (10898, 13, 6, 5, 0);
INSERT INTO order_details VALUES (10899, 39, 18, 8, 0.150000006);
INSERT INTO order_details VALUES (10900, 70, 15, 3, 0.25);
INSERT INTO order_details VALUES (10901, 41, 9.64999962, 30, 0);
INSERT INTO order_details VALUES (10901, 71, 21.5, 30, 0);
INSERT INTO order_details VALUES (10902, 55, 24, 30, 0.150000006);
INSERT INTO order_details VALUES (10902, 62, 49.2999992, 6, 0.150000006);
INSERT INTO order_details VALUES (10903, 13, 6, 40, 0);
INSERT INTO order_details VALUES (10903, 65, 21.0499992, 21, 0);
INSERT INTO order_details VALUES (10903, 68, 12.5, 20, 0);
INSERT INTO order_details VALUES (10904, 58, 13.25, 15, 0);
INSERT INTO order_details VALUES (10904, 62, 49.2999992, 35, 0);
INSERT INTO order_details VALUES (10905, 1, 18, 20, 0.0500000007);
INSERT INTO order_details VALUES (10906, 61, 28.5, 15, 0);
INSERT INTO order_details VALUES (10907, 75, 7.75, 14, 0);
INSERT INTO order_details VALUES (10908, 7, 30, 20, 0.0500000007);
INSERT INTO order_details VALUES (10908, 52, 7, 14, 0.0500000007);
INSERT INTO order_details VALUES (10909, 7, 30, 12, 0);
INSERT INTO order_details VALUES (10909, 16, 17.4500008, 15, 0);
INSERT INTO order_details VALUES (10909, 41, 9.64999962, 5, 0);
INSERT INTO order_details VALUES (10910, 19, 9.19999981, 12, 0);
INSERT INTO order_details VALUES (10910, 49, 20, 10, 0);
INSERT INTO order_details VALUES (10910, 61, 28.5, 5, 0);
INSERT INTO order_details VALUES (10911, 1, 18, 10, 0);
INSERT INTO order_details VALUES (10911, 17, 39, 12, 0);
INSERT INTO order_details VALUES (10911, 67, 14, 15, 0);
INSERT INTO order_details VALUES (10912, 11, 21, 40, 0.25);
INSERT INTO order_details VALUES (10912, 29, 123.790001, 60, 0.25);
INSERT INTO order_details VALUES (10913, 4, 22, 30, 0.25);
INSERT INTO order_details VALUES (10913, 33, 2.5, 40, 0.25);
INSERT INTO order_details VALUES (10913, 58, 13.25, 15, 0);
INSERT INTO order_details VALUES (10914, 71, 21.5, 25, 0);
INSERT INTO order_details VALUES (10915, 17, 39, 10, 0);
INSERT INTO order_details VALUES (10915, 33, 2.5, 30, 0);
INSERT INTO order_details VALUES (10915, 54, 7.44999981, 10, 0);
INSERT INTO order_details VALUES (10916, 16, 17.4500008, 6, 0);
INSERT INTO order_details VALUES (10916, 32, 32, 6, 0);
INSERT INTO order_details VALUES (10916, 57, 19.5, 20, 0);
INSERT INTO order_details VALUES (10917, 30, 25.8899994, 1, 0);
INSERT INTO order_details VALUES (10917, 60, 34, 10, 0);
INSERT INTO order_details VALUES (10918, 1, 18, 60, 0.25);
INSERT INTO order_details VALUES (10918, 60, 34, 25, 0.25);
INSERT INTO order_details VALUES (10919, 16, 17.4500008, 24, 0);
INSERT INTO order_details VALUES (10919, 25, 14, 24, 0);
INSERT INTO order_details VALUES (10919, 40, 18.3999996, 20, 0);
INSERT INTO order_details VALUES (10920, 50, 16.25, 24, 0);
INSERT INTO order_details VALUES (10921, 35, 18, 10, 0);
INSERT INTO order_details VALUES (10921, 63, 43.9000015, 40, 0);
INSERT INTO order_details VALUES (10922, 17, 39, 15, 0);
INSERT INTO order_details VALUES (10922, 24, 4.5, 35, 0);
INSERT INTO order_details VALUES (10923, 42, 14, 10, 0.200000003);
INSERT INTO order_details VALUES (10923, 43, 46, 10, 0.200000003);
INSERT INTO order_details VALUES (10923, 67, 14, 24, 0.200000003);
INSERT INTO order_details VALUES (10924, 10, 31, 20, 0.100000001);
INSERT INTO order_details VALUES (10924, 28, 45.5999985, 30, 0.100000001);
INSERT INTO order_details VALUES (10924, 75, 7.75, 6, 0);
INSERT INTO order_details VALUES (10925, 36, 19, 25, 0.150000006);
INSERT INTO order_details VALUES (10925, 52, 7, 12, 0.150000006);
INSERT INTO order_details VALUES (10926, 11, 21, 2, 0);
INSERT INTO order_details VALUES (10926, 13, 6, 10, 0);
INSERT INTO order_details VALUES (10926, 19, 9.19999981, 7, 0);
INSERT INTO order_details VALUES (10926, 72, 34.7999992, 10, 0);
INSERT INTO order_details VALUES (10927, 20, 81, 5, 0);
INSERT INTO order_details VALUES (10927, 52, 7, 5, 0);
INSERT INTO order_details VALUES (10927, 76, 18, 20, 0);
INSERT INTO order_details VALUES (10928, 47, 9.5, 5, 0);
INSERT INTO order_details VALUES (10928, 76, 18, 5, 0);
INSERT INTO order_details VALUES (10929, 21, 10, 60, 0);
INSERT INTO order_details VALUES (10929, 75, 7.75, 49, 0);
INSERT INTO order_details VALUES (10929, 77, 13, 15, 0);
INSERT INTO order_details VALUES (10930, 21, 10, 36, 0);
INSERT INTO order_details VALUES (10930, 27, 43.9000015, 25, 0);
INSERT INTO order_details VALUES (10930, 55, 24, 25, 0.200000003);
INSERT INTO order_details VALUES (10930, 58, 13.25, 30, 0.200000003);
INSERT INTO order_details VALUES (10931, 13, 6, 42, 0.150000006);
INSERT INTO order_details VALUES (10931, 57, 19.5, 30, 0);
INSERT INTO order_details VALUES (10932, 16, 17.4500008, 30, 0.100000001);
INSERT INTO order_details VALUES (10932, 62, 49.2999992, 14, 0.100000001);
INSERT INTO order_details VALUES (10932, 72, 34.7999992, 16, 0);
INSERT INTO order_details VALUES (10932, 75, 7.75, 20, 0.100000001);
INSERT INTO order_details VALUES (10933, 53, 32.7999992, 2, 0);
INSERT INTO order_details VALUES (10933, 61, 28.5, 30, 0);
INSERT INTO order_details VALUES (10934, 6, 25, 20, 0);
INSERT INTO order_details VALUES (10935, 1, 18, 21, 0);
INSERT INTO order_details VALUES (10935, 18, 62.5, 4, 0.25);
INSERT INTO order_details VALUES (10935, 23, 9, 8, 0.25);
INSERT INTO order_details VALUES (10936, 36, 19, 30, 0.200000003);
INSERT INTO order_details VALUES (10937, 28, 45.5999985, 8, 0);
INSERT INTO order_details VALUES (10937, 34, 14, 20, 0);
INSERT INTO order_details VALUES (10938, 13, 6, 20, 0.25);
INSERT INTO order_details VALUES (10938, 43, 46, 24, 0.25);
INSERT INTO order_details VALUES (10938, 60, 34, 49, 0.25);
INSERT INTO order_details VALUES (10938, 71, 21.5, 35, 0.25);
INSERT INTO order_details VALUES (10939, 2, 19, 10, 0.150000006);
INSERT INTO order_details VALUES (10939, 67, 14, 40, 0.150000006);
INSERT INTO order_details VALUES (10940, 7, 30, 8, 0);
INSERT INTO order_details VALUES (10940, 13, 6, 20, 0);
INSERT INTO order_details VALUES (10941, 31, 12.5, 44, 0.25);
INSERT INTO order_details VALUES (10941, 62, 49.2999992, 30, 0.25);
INSERT INTO order_details VALUES (10941, 68, 12.5, 80, 0.25);
INSERT INTO order_details VALUES (10941, 72, 34.7999992, 50, 0);
INSERT INTO order_details VALUES (10942, 49, 20, 28, 0);
INSERT INTO order_details VALUES (10943, 13, 6, 15, 0);
INSERT INTO order_details VALUES (10943, 22, 21, 21, 0);
INSERT INTO order_details VALUES (10943, 46, 12, 15, 0);
INSERT INTO order_details VALUES (10944, 11, 21, 5, 0.25);
INSERT INTO order_details VALUES (10944, 44, 19.4500008, 18, 0.25);
INSERT INTO order_details VALUES (10944, 56, 38, 18, 0);
INSERT INTO order_details VALUES (10945, 13, 6, 20, 0);
INSERT INTO order_details VALUES (10945, 31, 12.5, 10, 0);
INSERT INTO order_details VALUES (10946, 10, 31, 25, 0);
INSERT INTO order_details VALUES (10946, 24, 4.5, 25, 0);
INSERT INTO order_details VALUES (10946, 77, 13, 40, 0);
INSERT INTO order_details VALUES (10947, 59, 55, 4, 0);
INSERT INTO order_details VALUES (10948, 50, 16.25, 9, 0);
INSERT INTO order_details VALUES (10948, 51, 53, 40, 0);
INSERT INTO order_details VALUES (10948, 55, 24, 4, 0);
INSERT INTO order_details VALUES (10949, 6, 25, 12, 0);
INSERT INTO order_details VALUES (10949, 10, 31, 30, 0);
INSERT INTO order_details VALUES (10949, 17, 39, 6, 0);
INSERT INTO order_details VALUES (10949, 62, 49.2999992, 60, 0);
INSERT INTO order_details VALUES (10950, 4, 22, 5, 0);
INSERT INTO order_details VALUES (10951, 33, 2.5, 15, 0.0500000007);
INSERT INTO order_details VALUES (10951, 41, 9.64999962, 6, 0.0500000007);
INSERT INTO order_details VALUES (10951, 75, 7.75, 50, 0.0500000007);
INSERT INTO order_details VALUES (10952, 6, 25, 16, 0.0500000007);
INSERT INTO order_details VALUES (10952, 28, 45.5999985, 2, 0);
INSERT INTO order_details VALUES (10953, 20, 81, 50, 0.0500000007);
INSERT INTO order_details VALUES (10953, 31, 12.5, 50, 0.0500000007);
INSERT INTO order_details VALUES (10954, 16, 17.4500008, 28, 0.150000006);
INSERT INTO order_details VALUES (10954, 31, 12.5, 25, 0.150000006);
INSERT INTO order_details VALUES (10954, 45, 9.5, 30, 0);
INSERT INTO order_details VALUES (10954, 60, 34, 24, 0.150000006);
INSERT INTO order_details VALUES (10955, 75, 7.75, 12, 0.200000003);
INSERT INTO order_details VALUES (10956, 21, 10, 12, 0);
INSERT INTO order_details VALUES (10956, 47, 9.5, 14, 0);
INSERT INTO order_details VALUES (10956, 51, 53, 8, 0);
INSERT INTO order_details VALUES (10957, 30, 25.8899994, 30, 0);
INSERT INTO order_details VALUES (10957, 35, 18, 40, 0);
INSERT INTO order_details VALUES (10957, 64, 33.25, 8, 0);
INSERT INTO order_details VALUES (10958, 5, 21.3500004, 20, 0);
INSERT INTO order_details VALUES (10958, 7, 30, 6, 0);
INSERT INTO order_details VALUES (10958, 72, 34.7999992, 5, 0);
INSERT INTO order_details VALUES (10959, 75, 7.75, 20, 0.150000006);
INSERT INTO order_details VALUES (10960, 24, 4.5, 10, 0.25);
INSERT INTO order_details VALUES (10960, 41, 9.64999962, 24, 0);
INSERT INTO order_details VALUES (10961, 52, 7, 6, 0.0500000007);
INSERT INTO order_details VALUES (10961, 76, 18, 60, 0);
INSERT INTO order_details VALUES (10962, 7, 30, 45, 0);
INSERT INTO order_details VALUES (10962, 13, 6, 77, 0);
INSERT INTO order_details VALUES (10962, 53, 32.7999992, 20, 0);
INSERT INTO order_details VALUES (10962, 69, 36, 9, 0);
INSERT INTO order_details VALUES (10962, 76, 18, 44, 0);
INSERT INTO order_details VALUES (10963, 60, 34, 2, 0.150000006);
INSERT INTO order_details VALUES (10964, 18, 62.5, 6, 0);
INSERT INTO order_details VALUES (10964, 38, 263.5, 5, 0);
INSERT INTO order_details VALUES (10964, 69, 36, 10, 0);
INSERT INTO order_details VALUES (10965, 51, 53, 16, 0);
INSERT INTO order_details VALUES (10966, 37, 26, 8, 0);
INSERT INTO order_details VALUES (10966, 56, 38, 12, 0.150000006);
INSERT INTO order_details VALUES (10966, 62, 49.2999992, 12, 0.150000006);
INSERT INTO order_details VALUES (10967, 19, 9.19999981, 12, 0);
INSERT INTO order_details VALUES (10967, 49, 20, 40, 0);
INSERT INTO order_details VALUES (10968, 12, 38, 30, 0);
INSERT INTO order_details VALUES (10968, 24, 4.5, 30, 0);
INSERT INTO order_details VALUES (10968, 64, 33.25, 4, 0);
INSERT INTO order_details VALUES (10969, 46, 12, 9, 0);
INSERT INTO order_details VALUES (10970, 52, 7, 40, 0.200000003);
INSERT INTO order_details VALUES (10971, 29, 123.790001, 14, 0);
INSERT INTO order_details VALUES (10972, 17, 39, 6, 0);
INSERT INTO order_details VALUES (10972, 33, 2.5, 7, 0);
INSERT INTO order_details VALUES (10973, 26, 31.2299995, 5, 0);
INSERT INTO order_details VALUES (10973, 41, 9.64999962, 6, 0);
INSERT INTO order_details VALUES (10973, 75, 7.75, 10, 0);
INSERT INTO order_details VALUES (10974, 63, 43.9000015, 10, 0);
INSERT INTO order_details VALUES (10975, 8, 40, 16, 0);
INSERT INTO order_details VALUES (10975, 75, 7.75, 10, 0);
INSERT INTO order_details VALUES (10976, 28, 45.5999985, 20, 0);
INSERT INTO order_details VALUES (10977, 39, 18, 30, 0);
INSERT INTO order_details VALUES (10977, 47, 9.5, 30, 0);
INSERT INTO order_details VALUES (10977, 51, 53, 10, 0);
INSERT INTO order_details VALUES (10977, 63, 43.9000015, 20, 0);
INSERT INTO order_details VALUES (10978, 8, 40, 20, 0.150000006);
INSERT INTO order_details VALUES (10978, 21, 10, 40, 0.150000006);
INSERT INTO order_details VALUES (10978, 40, 18.3999996, 10, 0);
INSERT INTO order_details VALUES (10978, 44, 19.4500008, 6, 0.150000006);
INSERT INTO order_details VALUES (10979, 7, 30, 18, 0);
INSERT INTO order_details VALUES (10979, 12, 38, 20, 0);
INSERT INTO order_details VALUES (10979, 24, 4.5, 80, 0);
INSERT INTO order_details VALUES (10979, 27, 43.9000015, 30, 0);
INSERT INTO order_details VALUES (10979, 31, 12.5, 24, 0);
INSERT INTO order_details VALUES (10979, 63, 43.9000015, 35, 0);
INSERT INTO order_details VALUES (10980, 75, 7.75, 40, 0.200000003);
INSERT INTO order_details VALUES (10981, 38, 263.5, 60, 0);
INSERT INTO order_details VALUES (10982, 7, 30, 20, 0);
INSERT INTO order_details VALUES (10982, 43, 46, 9, 0);
INSERT INTO order_details VALUES (10983, 13, 6, 84, 0.150000006);
INSERT INTO order_details VALUES (10983, 57, 19.5, 15, 0);
INSERT INTO order_details VALUES (10984, 16, 17.4500008, 55, 0);
INSERT INTO order_details VALUES (10984, 24, 4.5, 20, 0);
INSERT INTO order_details VALUES (10984, 36, 19, 40, 0);
INSERT INTO order_details VALUES (10985, 16, 17.4500008, 36, 0.100000001);
INSERT INTO order_details VALUES (10985, 18, 62.5, 8, 0.100000001);
INSERT INTO order_details VALUES (10985, 32, 32, 35, 0.100000001);
INSERT INTO order_details VALUES (10986, 11, 21, 30, 0);
INSERT INTO order_details VALUES (10986, 20, 81, 15, 0);
INSERT INTO order_details VALUES (10986, 76, 18, 10, 0);
INSERT INTO order_details VALUES (10986, 77, 13, 15, 0);
INSERT INTO order_details VALUES (10987, 7, 30, 60, 0);
INSERT INTO order_details VALUES (10987, 43, 46, 6, 0);
INSERT INTO order_details VALUES (10987, 72, 34.7999992, 20, 0);
INSERT INTO order_details VALUES (10988, 7, 30, 60, 0);
INSERT INTO order_details VALUES (10988, 62, 49.2999992, 40, 0.100000001);
INSERT INTO order_details VALUES (10989, 6, 25, 40, 0);
INSERT INTO order_details VALUES (10989, 11, 21, 15, 0);
INSERT INTO order_details VALUES (10989, 41, 9.64999962, 4, 0);
INSERT INTO order_details VALUES (10990, 21, 10, 65, 0);
INSERT INTO order_details VALUES (10990, 34, 14, 60, 0.150000006);
INSERT INTO order_details VALUES (10990, 55, 24, 65, 0.150000006);
INSERT INTO order_details VALUES (10990, 61, 28.5, 66, 0.150000006);
INSERT INTO order_details VALUES (10991, 2, 19, 50, 0.200000003);
INSERT INTO order_details VALUES (10991, 70, 15, 20, 0.200000003);
INSERT INTO order_details VALUES (10991, 76, 18, 90, 0.200000003);
INSERT INTO order_details VALUES (10992, 72, 34.7999992, 2, 0);
INSERT INTO order_details VALUES (10993, 29, 123.790001, 50, 0.25);
INSERT INTO order_details VALUES (10993, 41, 9.64999962, 35, 0.25);
INSERT INTO order_details VALUES (10994, 59, 55, 18, 0.0500000007);
INSERT INTO order_details VALUES (10995, 51, 53, 20, 0);
INSERT INTO order_details VALUES (10995, 60, 34, 4, 0);
INSERT INTO order_details VALUES (10996, 42, 14, 40, 0);
INSERT INTO order_details VALUES (10997, 32, 32, 50, 0);
INSERT INTO order_details VALUES (10997, 46, 12, 20, 0.25);
INSERT INTO order_details VALUES (10997, 52, 7, 20, 0.25);
INSERT INTO order_details VALUES (10998, 24, 4.5, 12, 0);
INSERT INTO order_details VALUES (10998, 61, 28.5, 7, 0);
INSERT INTO order_details VALUES (10998, 74, 10, 20, 0);
INSERT INTO order_details VALUES (10998, 75, 7.75, 30, 0);
INSERT INTO order_details VALUES (10999, 41, 9.64999962, 20, 0.0500000007);
INSERT INTO order_details VALUES (10999, 51, 53, 15, 0.0500000007);
INSERT INTO order_details VALUES (10999, 77, 13, 21, 0.0500000007);
INSERT INTO order_details VALUES (11000, 4, 22, 25, 0.25);
INSERT INTO order_details VALUES (11000, 24, 4.5, 30, 0.25);
INSERT INTO order_details VALUES (11000, 77, 13, 30, 0);
INSERT INTO order_details VALUES (11001, 7, 30, 60, 0);
INSERT INTO order_details VALUES (11001, 22, 21, 25, 0);
INSERT INTO order_details VALUES (11001, 46, 12, 25, 0);
INSERT INTO order_details VALUES (11001, 55, 24, 6, 0);
INSERT INTO order_details VALUES (11002, 13, 6, 56, 0);
INSERT INTO order_details VALUES (11002, 35, 18, 15, 0.150000006);
INSERT INTO order_details VALUES (11002, 42, 14, 24, 0.150000006);
INSERT INTO order_details VALUES (11002, 55, 24, 40, 0);
INSERT INTO order_details VALUES (11003, 1, 18, 4, 0);
INSERT INTO order_details VALUES (11003, 40, 18.3999996, 10, 0);
INSERT INTO order_details VALUES (11003, 52, 7, 10, 0);
INSERT INTO order_details VALUES (11004, 26, 31.2299995, 6, 0);
INSERT INTO order_details VALUES (11004, 76, 18, 6, 0);
INSERT INTO order_details VALUES (11005, 1, 18, 2, 0);
INSERT INTO order_details VALUES (11005, 59, 55, 10, 0);
INSERT INTO order_details VALUES (11006, 1, 18, 8, 0);
INSERT INTO order_details VALUES (11006, 29, 123.790001, 2, 0.25);
INSERT INTO order_details VALUES (11007, 8, 40, 30, 0);
INSERT INTO order_details VALUES (11007, 29, 123.790001, 10, 0);
INSERT INTO order_details VALUES (11007, 42, 14, 14, 0);
INSERT INTO order_details VALUES (11008, 28, 45.5999985, 70, 0.0500000007);
INSERT INTO order_details VALUES (11008, 34, 14, 90, 0.0500000007);
INSERT INTO order_details VALUES (11008, 71, 21.5, 21, 0);
INSERT INTO order_details VALUES (11009, 24, 4.5, 12, 0);
INSERT INTO order_details VALUES (11009, 36, 19, 18, 0.25);
INSERT INTO order_details VALUES (11009, 60, 34, 9, 0);
INSERT INTO order_details VALUES (11010, 7, 30, 20, 0);
INSERT INTO order_details VALUES (11010, 24, 4.5, 10, 0);
INSERT INTO order_details VALUES (11011, 58, 13.25, 40, 0.0500000007);
INSERT INTO order_details VALUES (11011, 71, 21.5, 20, 0);
INSERT INTO order_details VALUES (11012, 19, 9.19999981, 50, 0.0500000007);
INSERT INTO order_details VALUES (11012, 60, 34, 36, 0.0500000007);
INSERT INTO order_details VALUES (11012, 71, 21.5, 60, 0.0500000007);
INSERT INTO order_details VALUES (11013, 23, 9, 10, 0);
INSERT INTO order_details VALUES (11013, 42, 14, 4, 0);
INSERT INTO order_details VALUES (11013, 45, 9.5, 20, 0);
INSERT INTO order_details VALUES (11013, 68, 12.5, 2, 0);
INSERT INTO order_details VALUES (11014, 41, 9.64999962, 28, 0.100000001);
INSERT INTO order_details VALUES (11015, 30, 25.8899994, 15, 0);
INSERT INTO order_details VALUES (11015, 77, 13, 18, 0);
INSERT INTO order_details VALUES (11016, 31, 12.5, 15, 0);
INSERT INTO order_details VALUES (11016, 36, 19, 16, 0);
INSERT INTO order_details VALUES (11017, 3, 10, 25, 0);
INSERT INTO order_details VALUES (11017, 59, 55, 110, 0);
INSERT INTO order_details VALUES (11017, 70, 15, 30, 0);
INSERT INTO order_details VALUES (11018, 12, 38, 20, 0);
INSERT INTO order_details VALUES (11018, 18, 62.5, 10, 0);
INSERT INTO order_details VALUES (11018, 56, 38, 5, 0);
INSERT INTO order_details VALUES (11019, 46, 12, 3, 0);
INSERT INTO order_details VALUES (11019, 49, 20, 2, 0);
INSERT INTO order_details VALUES (11020, 10, 31, 24, 0.150000006);
INSERT INTO order_details VALUES (11021, 2, 19, 11, 0.25);
INSERT INTO order_details VALUES (11021, 20, 81, 15, 0);
INSERT INTO order_details VALUES (11021, 26, 31.2299995, 63, 0);
INSERT INTO order_details VALUES (11021, 51, 53, 44, 0.25);
INSERT INTO order_details VALUES (11021, 72, 34.7999992, 35, 0);
INSERT INTO order_details VALUES (11022, 19, 9.19999981, 35, 0);
INSERT INTO order_details VALUES (11022, 69, 36, 30, 0);
INSERT INTO order_details VALUES (11023, 7, 30, 4, 0);
INSERT INTO order_details VALUES (11023, 43, 46, 30, 0);
INSERT INTO order_details VALUES (11024, 26, 31.2299995, 12, 0);
INSERT INTO order_details VALUES (11024, 33, 2.5, 30, 0);
INSERT INTO order_details VALUES (11024, 65, 21.0499992, 21, 0);
INSERT INTO order_details VALUES (11024, 71, 21.5, 50, 0);
INSERT INTO order_details VALUES (11025, 1, 18, 10, 0.100000001);
INSERT INTO order_details VALUES (11025, 13, 6, 20, 0.100000001);
INSERT INTO order_details VALUES (11026, 18, 62.5, 8, 0);
INSERT INTO order_details VALUES (11026, 51, 53, 10, 0);
INSERT INTO order_details VALUES (11027, 24, 4.5, 30, 0.25);
INSERT INTO order_details VALUES (11027, 62, 49.2999992, 21, 0.25);
INSERT INTO order_details VALUES (11028, 55, 24, 35, 0);
INSERT INTO order_details VALUES (11028, 59, 55, 24, 0);
INSERT INTO order_details VALUES (11029, 56, 38, 20, 0);
INSERT INTO order_details VALUES (11029, 63, 43.9000015, 12, 0);
INSERT INTO order_details VALUES (11030, 2, 19, 100, 0.25);
INSERT INTO order_details VALUES (11030, 5, 21.3500004, 70, 0);
INSERT INTO order_details VALUES (11030, 29, 123.790001, 60, 0.25);
INSERT INTO order_details VALUES (11030, 59, 55, 100, 0.25);
INSERT INTO order_details VALUES (11031, 1, 18, 45, 0);
INSERT INTO order_details VALUES (11031, 13, 6, 80, 0);
INSERT INTO order_details VALUES (11031, 24, 4.5, 21, 0);
INSERT INTO order_details VALUES (11031, 64, 33.25, 20, 0);
INSERT INTO order_details VALUES (11031, 71, 21.5, 16, 0);
INSERT INTO order_details VALUES (11032, 36, 19, 35, 0);
INSERT INTO order_details VALUES (11032, 38, 263.5, 25, 0);
INSERT INTO order_details VALUES (11032, 59, 55, 30, 0);
INSERT INTO order_details VALUES (11033, 53, 32.7999992, 70, 0.100000001);
INSERT INTO order_details VALUES (11033, 69, 36, 36, 0.100000001);
INSERT INTO order_details VALUES (11034, 21, 10, 15, 0.100000001);
INSERT INTO order_details VALUES (11034, 44, 19.4500008, 12, 0);
INSERT INTO order_details VALUES (11034, 61, 28.5, 6, 0);
INSERT INTO order_details VALUES (11035, 1, 18, 10, 0);
INSERT INTO order_details VALUES (11035, 35, 18, 60, 0);
INSERT INTO order_details VALUES (11035, 42, 14, 30, 0);
INSERT INTO order_details VALUES (11035, 54, 7.44999981, 10, 0);
INSERT INTO order_details VALUES (11036, 13, 6, 7, 0);
INSERT INTO order_details VALUES (11036, 59, 55, 30, 0);
INSERT INTO order_details VALUES (11037, 70, 15, 4, 0);
INSERT INTO order_details VALUES (11038, 40, 18.3999996, 5, 0.200000003);
INSERT INTO order_details VALUES (11038, 52, 7, 2, 0);
INSERT INTO order_details VALUES (11038, 71, 21.5, 30, 0);
INSERT INTO order_details VALUES (11039, 28, 45.5999985, 20, 0);
INSERT INTO order_details VALUES (11039, 35, 18, 24, 0);
INSERT INTO order_details VALUES (11039, 49, 20, 60, 0);
INSERT INTO order_details VALUES (11039, 57, 19.5, 28, 0);
INSERT INTO order_details VALUES (11040, 21, 10, 20, 0);
INSERT INTO order_details VALUES (11041, 2, 19, 30, 0.200000003);
INSERT INTO order_details VALUES (11041, 63, 43.9000015, 30, 0);
INSERT INTO order_details VALUES (11042, 44, 19.4500008, 15, 0);
INSERT INTO order_details VALUES (11042, 61, 28.5, 4, 0);
INSERT INTO order_details VALUES (11043, 11, 21, 10, 0);
INSERT INTO order_details VALUES (11044, 62, 49.2999992, 12, 0);
INSERT INTO order_details VALUES (11045, 33, 2.5, 15, 0);
INSERT INTO order_details VALUES (11045, 51, 53, 24, 0);
INSERT INTO order_details VALUES (11046, 12, 38, 20, 0.0500000007);
INSERT INTO order_details VALUES (11046, 32, 32, 15, 0.0500000007);
INSERT INTO order_details VALUES (11046, 35, 18, 18, 0.0500000007);
INSERT INTO order_details VALUES (11047, 1, 18, 25, 0.25);
INSERT INTO order_details VALUES (11047, 5, 21.3500004, 30, 0.25);
INSERT INTO order_details VALUES (11048, 68, 12.5, 42, 0);
INSERT INTO order_details VALUES (11049, 2, 19, 10, 0.200000003);
INSERT INTO order_details VALUES (11049, 12, 38, 4, 0.200000003);
INSERT INTO order_details VALUES (11050, 76, 18, 50, 0.100000001);
INSERT INTO order_details VALUES (11051, 24, 4.5, 10, 0.200000003);
INSERT INTO order_details VALUES (11052, 43, 46, 30, 0.200000003);
INSERT INTO order_details VALUES (11052, 61, 28.5, 10, 0.200000003);
INSERT INTO order_details VALUES (11053, 18, 62.5, 35, 0.200000003);
INSERT INTO order_details VALUES (11053, 32, 32, 20, 0);
INSERT INTO order_details VALUES (11053, 64, 33.25, 25, 0.200000003);
INSERT INTO order_details VALUES (11054, 33, 2.5, 10, 0);
INSERT INTO order_details VALUES (11054, 67, 14, 20, 0);
INSERT INTO order_details VALUES (11055, 24, 4.5, 15, 0);
INSERT INTO order_details VALUES (11055, 25, 14, 15, 0);
INSERT INTO order_details VALUES (11055, 51, 53, 20, 0);
INSERT INTO order_details VALUES (11055, 57, 19.5, 20, 0);
INSERT INTO order_details VALUES (11056, 7, 30, 40, 0);
INSERT INTO order_details VALUES (11056, 55, 24, 35, 0);
INSERT INTO order_details VALUES (11056, 60, 34, 50, 0);
INSERT INTO order_details VALUES (11057, 70, 15, 3, 0);
INSERT INTO order_details VALUES (11058, 21, 10, 3, 0);
INSERT INTO order_details VALUES (11058, 60, 34, 21, 0);
INSERT INTO order_details VALUES (11058, 61, 28.5, 4, 0);
INSERT INTO order_details VALUES (11059, 13, 6, 30, 0);
INSERT INTO order_details VALUES (11059, 17, 39, 12, 0);
INSERT INTO order_details VALUES (11059, 60, 34, 35, 0);
INSERT INTO order_details VALUES (11060, 60, 34, 4, 0);
INSERT INTO order_details VALUES (11060, 77, 13, 10, 0);
INSERT INTO order_details VALUES (11061, 60, 34, 15, 0);
INSERT INTO order_details VALUES (11062, 53, 32.7999992, 10, 0.200000003);
INSERT INTO order_details VALUES (11062, 70, 15, 12, 0.200000003);
INSERT INTO order_details VALUES (11063, 34, 14, 30, 0);
INSERT INTO order_details VALUES (11063, 40, 18.3999996, 40, 0.100000001);
INSERT INTO order_details VALUES (11063, 41, 9.64999962, 30, 0.100000001);
INSERT INTO order_details VALUES (11064, 17, 39, 77, 0.100000001);
INSERT INTO order_details VALUES (11064, 41, 9.64999962, 12, 0);
INSERT INTO order_details VALUES (11064, 53, 32.7999992, 25, 0.100000001);
INSERT INTO order_details VALUES (11064, 55, 24, 4, 0.100000001);
INSERT INTO order_details VALUES (11064, 68, 12.5, 55, 0);
INSERT INTO order_details VALUES (11065, 30, 25.8899994, 4, 0.25);
INSERT INTO order_details VALUES (11065, 54, 7.44999981, 20, 0.25);
INSERT INTO order_details VALUES (11066, 16, 17.4500008, 3, 0);
INSERT INTO order_details VALUES (11066, 19, 9.19999981, 42, 0);
INSERT INTO order_details VALUES (11066, 34, 14, 35, 0);
INSERT INTO order_details VALUES (11067, 41, 9.64999962, 9, 0);
INSERT INTO order_details VALUES (11068, 28, 45.5999985, 8, 0.150000006);
INSERT INTO order_details VALUES (11068, 43, 46, 36, 0.150000006);
INSERT INTO order_details VALUES (11068, 77, 13, 28, 0.150000006);
INSERT INTO order_details VALUES (11069, 39, 18, 20, 0);
INSERT INTO order_details VALUES (11070, 1, 18, 40, 0.150000006);
INSERT INTO order_details VALUES (11070, 2, 19, 20, 0.150000006);
INSERT INTO order_details VALUES (11070, 16, 17.4500008, 30, 0.150000006);
INSERT INTO order_details VALUES (11070, 31, 12.5, 20, 0);
INSERT INTO order_details VALUES (11071, 7, 30, 15, 0.0500000007);
INSERT INTO order_details VALUES (11071, 13, 6, 10, 0.0500000007);
INSERT INTO order_details VALUES (11072, 2, 19, 8, 0);
INSERT INTO order_details VALUES (11072, 41, 9.64999962, 40, 0);
INSERT INTO order_details VALUES (11072, 50, 16.25, 22, 0);
INSERT INTO order_details VALUES (11072, 64, 33.25, 130, 0);
INSERT INTO order_details VALUES (11073, 11, 21, 10, 0);
INSERT INTO order_details VALUES (11073, 24, 4.5, 20, 0);
INSERT INTO order_details VALUES (11074, 16, 17.4500008, 14, 0.0500000007);
INSERT INTO order_details VALUES (11075, 2, 19, 10, 0.150000006);
INSERT INTO order_details VALUES (11075, 46, 12, 30, 0.150000006);
INSERT INTO order_details VALUES (11075, 76, 18, 2, 0.150000006);
INSERT INTO order_details VALUES (11076, 6, 25, 20, 0.25);
INSERT INTO order_details VALUES (11076, 14, 23.25, 20, 0.25);
INSERT INTO order_details VALUES (11076, 19, 9.19999981, 10, 0.25);
INSERT INTO order_details VALUES (11077, 2, 19, 24, 0.200000003);
INSERT INTO order_details VALUES (11077, 3, 10, 4, 0);
INSERT INTO order_details VALUES (11077, 4, 22, 1, 0);
INSERT INTO order_details VALUES (11077, 6, 25, 1, 0.0199999996);
INSERT INTO order_details VALUES (11077, 7, 30, 1, 0.0500000007);
INSERT INTO order_details VALUES (11077, 8, 40, 2, 0.100000001);
INSERT INTO order_details VALUES (11077, 10, 31, 1, 0);
INSERT INTO order_details VALUES (11077, 12, 38, 2, 0.0500000007);
INSERT INTO order_details VALUES (11077, 13, 6, 4, 0);
INSERT INTO order_details VALUES (11077, 14, 23.25, 1, 0.0299999993);
INSERT INTO order_details VALUES (11077, 16, 17.4500008, 2, 0.0299999993);
INSERT INTO order_details VALUES (11077, 20, 81, 1, 0.0399999991);
INSERT INTO order_details VALUES (11077, 23, 9, 2, 0);
INSERT INTO order_details VALUES (11077, 32, 32, 1, 0);
INSERT INTO order_details VALUES (11077, 39, 18, 2, 0.0500000007);
INSERT INTO order_details VALUES (11077, 41, 9.64999962, 3, 0);
INSERT INTO order_details VALUES (11077, 46, 12, 3, 0.0199999996);
INSERT INTO order_details VALUES (11077, 52, 7, 2, 0);
INSERT INTO order_details VALUES (11077, 55, 24, 2, 0);
INSERT INTO order_details VALUES (11077, 60, 34, 2, 0.0599999987);
INSERT INTO order_details VALUES (11077, 64, 33.25, 2, 0.0299999993);
INSERT INTO order_details VALUES (11077, 66, 17, 1, 0);
INSERT INTO order_details VALUES (11077, 73, 15, 2, 0.00999999978);
INSERT INTO order_details VALUES (11077, 75, 7.75, 4, 0);
INSERT INTO order_details VALUES (11077, 77, 13, 2, 0);


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO orders VALUES (10248, 'VINET', 5, '1996-07-04', '1996-08-01', '1996-07-16', 3, 32.3800011, 'Vins et alcools Chevalier', '59 rue de l''Abbaye', 'Reims', NULL, '51100', 'France');
INSERT INTO orders VALUES (10249, 'TOMSP', 6, '1996-07-05', '1996-08-16', '1996-07-10', 1, 11.6099997, 'Toms Spezialitäten', 'Luisenstr. 48', 'Münster', NULL, '44087', 'Germany');
INSERT INTO orders VALUES (10250, 'HANAR', 4, '1996-07-08', '1996-08-05', '1996-07-12', 2, 65.8300018, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10251, 'VICTE', 3, '1996-07-08', '1996-08-05', '1996-07-15', 1, 41.3400002, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10252, 'SUPRD', 4, '1996-07-09', '1996-08-06', '1996-07-11', 2, 51.2999992, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10253, 'HANAR', 3, '1996-07-10', '1996-07-24', '1996-07-16', 2, 58.1699982, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10254, 'CHOPS', 5, '1996-07-11', '1996-08-08', '1996-07-23', 2, 22.9799995, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (10255, 'RICSU', 9, '1996-07-12', '1996-08-09', '1996-07-15', 3, 148.330002, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10256, 'WELLI', 3, '1996-07-15', '1996-08-12', '1996-07-17', 2, 13.9700003, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10257, 'HILAA', 4, '1996-07-16', '1996-08-13', '1996-07-22', 3, 81.9100037, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10258, 'ERNSH', 1, '1996-07-17', '1996-08-14', '1996-07-23', 1, 140.509995, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10259, 'CENTC', 4, '1996-07-18', '1996-08-15', '1996-07-25', 3, 3.25, 'Centro comercial Moctezuma', 'Sierras de Granada 9993', 'México D.F.', NULL, '05022', 'Mexico');
INSERT INTO orders VALUES (10260, 'OTTIK', 4, '1996-07-19', '1996-08-16', '1996-07-29', 1, 55.0900002, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10261, 'QUEDE', 4, '1996-07-19', '1996-08-16', '1996-07-30', 2, 3.04999995, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10262, 'RATTC', 8, '1996-07-22', '1996-08-19', '1996-07-25', 3, 48.2900009, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10263, 'ERNSH', 9, '1996-07-23', '1996-08-20', '1996-07-31', 3, 146.059998, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10264, 'FOLKO', 6, '1996-07-24', '1996-08-21', '1996-08-23', 3, 3.67000008, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10265, 'BLONP', 2, '1996-07-25', '1996-08-22', '1996-08-12', 1, 55.2799988, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10266, 'WARTH', 3, '1996-07-26', '1996-09-06', '1996-07-31', 3, 25.7299995, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10267, 'FRANK', 4, '1996-07-29', '1996-08-26', '1996-08-06', 1, 208.580002, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10268, 'GROSR', 8, '1996-07-30', '1996-08-27', '1996-08-02', 3, 66.2900009, 'GROSELLA-Restaurante', '5ª Ave. Los Palos Grandes', 'Caracas', 'DF', '1081', 'Venezuela');
INSERT INTO orders VALUES (10269, 'WHITC', 5, '1996-07-31', '1996-08-14', '1996-08-09', 1, 4.55999994, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10270, 'WARTH', 1, '1996-08-01', '1996-08-29', '1996-08-02', 1, 136.539993, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10271, 'SPLIR', 6, '1996-08-01', '1996-08-29', '1996-08-30', 2, 4.53999996, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10272, 'RATTC', 6, '1996-08-02', '1996-08-30', '1996-08-06', 2, 98.0299988, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10273, 'QUICK', 3, '1996-08-05', '1996-09-02', '1996-08-12', 3, 76.0699997, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10274, 'VINET', 6, '1996-08-06', '1996-09-03', '1996-08-16', 1, 6.01000023, 'Vins et alcools Chevalier', '59 rue de l''Abbaye', 'Reims', NULL, '51100', 'France');
INSERT INTO orders VALUES (10275, 'MAGAA', 1, '1996-08-07', '1996-09-04', '1996-08-09', 1, 26.9300003, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10276, 'TORTU', 8, '1996-08-08', '1996-08-22', '1996-08-14', 3, 13.8400002, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10277, 'MORGK', 2, '1996-08-09', '1996-09-06', '1996-08-13', 3, 125.769997, 'Morgenstern Gesundkost', 'Heerstr. 22', 'Leipzig', NULL, '04179', 'Germany');
INSERT INTO orders VALUES (10278, 'BERGS', 8, '1996-08-12', '1996-09-09', '1996-08-16', 2, 92.6900024, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10279, 'LEHMS', 8, '1996-08-13', '1996-09-10', '1996-08-16', 2, 25.8299999, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10280, 'BERGS', 2, '1996-08-14', '1996-09-11', '1996-09-12', 1, 8.97999954, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10281, 'ROMEY', 4, '1996-08-14', '1996-08-28', '1996-08-21', 1, 2.94000006, 'Romero y tomillo', 'Gran Vía, 1', 'Madrid', NULL, '28001', 'Spain');
INSERT INTO orders VALUES (10282, 'ROMEY', 4, '1996-08-15', '1996-09-12', '1996-08-21', 1, 12.6899996, 'Romero y tomillo', 'Gran Vía, 1', 'Madrid', NULL, '28001', 'Spain');
INSERT INTO orders VALUES (10283, 'LILAS', 3, '1996-08-16', '1996-09-13', '1996-08-23', 3, 84.8099976, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10284, 'LEHMS', 4, '1996-08-19', '1996-09-16', '1996-08-27', 1, 76.5599976, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10285, 'QUICK', 1, '1996-08-20', '1996-09-17', '1996-08-26', 2, 76.8300018, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10286, 'QUICK', 8, '1996-08-21', '1996-09-18', '1996-08-30', 3, 229.240005, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10287, 'RICAR', 8, '1996-08-22', '1996-09-19', '1996-08-28', 3, 12.7600002, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10288, 'REGGC', 4, '1996-08-23', '1996-09-20', '1996-09-03', 1, 7.44999981, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10289, 'BSBEV', 7, '1996-08-26', '1996-09-23', '1996-08-28', 3, 22.7700005, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10290, 'COMMI', 8, '1996-08-27', '1996-09-24', '1996-09-03', 1, 79.6999969, 'Comércio Mineiro', 'Av. dos Lusíadas, 23', 'Sao Paulo', 'SP', '05432-043', 'Brazil');
INSERT INTO orders VALUES (10291, 'QUEDE', 6, '1996-08-27', '1996-09-24', '1996-09-04', 2, 6.4000001, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10292, 'TRADH', 1, '1996-08-28', '1996-09-25', '1996-09-02', 2, 1.35000002, 'Tradiçao Hipermercados', 'Av. Inês de Castro, 414', 'Sao Paulo', 'SP', '05634-030', 'Brazil');
INSERT INTO orders VALUES (10293, 'TORTU', 1, '1996-08-29', '1996-09-26', '1996-09-11', 3, 21.1800003, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10294, 'RATTC', 4, '1996-08-30', '1996-09-27', '1996-09-05', 2, 147.259995, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10295, 'VINET', 2, '1996-09-02', '1996-09-30', '1996-09-10', 2, 1.14999998, 'Vins et alcools Chevalier', '59 rue de l''Abbaye', 'Reims', NULL, '51100', 'France');
INSERT INTO orders VALUES (10296, 'LILAS', 6, '1996-09-03', '1996-10-01', '1996-09-11', 1, 0.119999997, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10297, 'BLONP', 5, '1996-09-04', '1996-10-16', '1996-09-10', 2, 5.73999977, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10298, 'HUNGO', 6, '1996-09-05', '1996-10-03', '1996-09-11', 2, 168.220001, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10299, 'RICAR', 4, '1996-09-06', '1996-10-04', '1996-09-13', 2, 29.7600002, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10300, 'MAGAA', 2, '1996-09-09', '1996-10-07', '1996-09-18', 2, 17.6800003, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10301, 'WANDK', 8, '1996-09-09', '1996-10-07', '1996-09-17', 2, 45.0800018, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10302, 'SUPRD', 4, '1996-09-10', '1996-10-08', '1996-10-09', 2, 6.26999998, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10303, 'GODOS', 7, '1996-09-11', '1996-10-09', '1996-09-18', 2, 107.830002, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10304, 'TORTU', 1, '1996-09-12', '1996-10-10', '1996-09-17', 2, 63.7900009, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10305, 'OLDWO', 8, '1996-09-13', '1996-10-11', '1996-10-09', 3, 257.619995, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10306, 'ROMEY', 1, '1996-09-16', '1996-10-14', '1996-09-23', 3, 7.55999994, 'Romero y tomillo', 'Gran Vía, 1', 'Madrid', NULL, '28001', 'Spain');
INSERT INTO orders VALUES (10307, 'LONEP', 2, '1996-09-17', '1996-10-15', '1996-09-25', 2, 0.560000002, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (10308, 'ANATR', 7, '1996-09-18', '1996-10-16', '1996-09-24', 3, 1.61000001, 'Ana Trujillo Emparedados y helados', 'Avda. de la Constitución 2222', 'México D.F.', NULL, '05021', 'Mexico');
INSERT INTO orders VALUES (10309, 'HUNGO', 3, '1996-09-19', '1996-10-17', '1996-10-23', 1, 47.2999992, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10310, 'THEBI', 8, '1996-09-20', '1996-10-18', '1996-09-27', 2, 17.5200005, 'The Big Cheese', '89 Jefferson Way Suite 2', 'Portland', 'OR', '97201', 'USA');
INSERT INTO orders VALUES (10311, 'DUMON', 1, '1996-09-20', '1996-10-04', '1996-09-26', 3, 24.6900005, 'Du monde entier', '67, rue des Cinquante Otages', 'Nantes', NULL, '44000', 'France');
INSERT INTO orders VALUES (10312, 'WANDK', 2, '1996-09-23', '1996-10-21', '1996-10-03', 2, 40.2599983, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10313, 'QUICK', 2, '1996-09-24', '1996-10-22', '1996-10-04', 2, 1.96000004, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10314, 'RATTC', 1, '1996-09-25', '1996-10-23', '1996-10-04', 2, 74.1600037, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10315, 'ISLAT', 4, '1996-09-26', '1996-10-24', '1996-10-03', 2, 41.7599983, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10316, 'RATTC', 1, '1996-09-27', '1996-10-25', '1996-10-08', 3, 150.149994, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10317, 'LONEP', 6, '1996-09-30', '1996-10-28', '1996-10-10', 1, 12.6899996, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (10318, 'ISLAT', 8, '1996-10-01', '1996-10-29', '1996-10-04', 2, 4.73000002, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10319, 'TORTU', 7, '1996-10-02', '1996-10-30', '1996-10-11', 3, 64.5, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10320, 'WARTH', 5, '1996-10-03', '1996-10-17', '1996-10-18', 3, 34.5699997, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10321, 'ISLAT', 3, '1996-10-03', '1996-10-31', '1996-10-11', 2, 3.43000007, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10322, 'PERIC', 7, '1996-10-04', '1996-11-01', '1996-10-23', 3, 0.400000006, 'Pericles Comidas clásicas', 'Calle Dr. Jorge Cash 321', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10323, 'KOENE', 4, '1996-10-07', '1996-11-04', '1996-10-14', 1, 4.88000011, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10324, 'SAVEA', 9, '1996-10-08', '1996-11-05', '1996-10-10', 1, 214.270004, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10325, 'KOENE', 1, '1996-10-09', '1996-10-23', '1996-10-14', 3, 64.8600006, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10326, 'BOLID', 4, '1996-10-10', '1996-11-07', '1996-10-14', 2, 77.9199982, 'Bólido Comidas preparadas', 'C/ Araquil, 67', 'Madrid', NULL, '28023', 'Spain');
INSERT INTO orders VALUES (10327, 'FOLKO', 2, '1996-10-11', '1996-11-08', '1996-10-14', 1, 63.3600006, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10328, 'FURIB', 4, '1996-10-14', '1996-11-11', '1996-10-17', 3, 87.0299988, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10329, 'SPLIR', 4, '1996-10-15', '1996-11-26', '1996-10-23', 2, 191.669998, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10330, 'LILAS', 3, '1996-10-16', '1996-11-13', '1996-10-28', 1, 12.75, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10331, 'BONAP', 9, '1996-10-16', '1996-11-27', '1996-10-21', 1, 10.1899996, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10332, 'MEREP', 3, '1996-10-17', '1996-11-28', '1996-10-21', 2, 52.8400002, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10333, 'WARTH', 5, '1996-10-18', '1996-11-15', '1996-10-25', 3, 0.589999974, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10334, 'VICTE', 8, '1996-10-21', '1996-11-18', '1996-10-28', 2, 8.56000042, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10335, 'HUNGO', 7, '1996-10-22', '1996-11-19', '1996-10-24', 2, 42.1100006, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10336, 'PRINI', 7, '1996-10-23', '1996-11-20', '1996-10-25', 2, 15.5100002, 'Princesa Isabel Vinhos', 'Estrada da saúde n. 58', 'Lisboa', NULL, '1756', 'Portugal');
INSERT INTO orders VALUES (10337, 'FRANK', 4, '1996-10-24', '1996-11-21', '1996-10-29', 3, 108.260002, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10338, 'OLDWO', 4, '1996-10-25', '1996-11-22', '1996-10-29', 3, 84.2099991, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10339, 'MEREP', 2, '1996-10-28', '1996-11-25', '1996-11-04', 2, 15.6599998, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10340, 'BONAP', 1, '1996-10-29', '1996-11-26', '1996-11-08', 3, 166.309998, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10341, 'SIMOB', 7, '1996-10-29', '1996-11-26', '1996-11-05', 3, 26.7800007, 'Simons bistro', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark');
INSERT INTO orders VALUES (10342, 'FRANK', 4, '1996-10-30', '1996-11-13', '1996-11-04', 2, 54.8300018, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10343, 'LEHMS', 4, '1996-10-31', '1996-11-28', '1996-11-06', 1, 110.370003, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10344, 'WHITC', 4, '1996-11-01', '1996-11-29', '1996-11-05', 2, 23.2900009, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10345, 'QUICK', 2, '1996-11-04', '1996-12-02', '1996-11-11', 2, 249.059998, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10346, 'RATTC', 3, '1996-11-05', '1996-12-17', '1996-11-08', 3, 142.080002, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10347, 'FAMIA', 4, '1996-11-06', '1996-12-04', '1996-11-08', 3, 3.0999999, 'Familia Arquibaldo', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil');
INSERT INTO orders VALUES (10348, 'WANDK', 4, '1996-11-07', '1996-12-05', '1996-11-15', 2, 0.779999971, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10349, 'SPLIR', 7, '1996-11-08', '1996-12-06', '1996-11-15', 1, 8.63000011, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10350, 'LAMAI', 6, '1996-11-11', '1996-12-09', '1996-12-03', 2, 64.1900024, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10351, 'ERNSH', 1, '1996-11-11', '1996-12-09', '1996-11-20', 1, 162.330002, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10352, 'FURIB', 3, '1996-11-12', '1996-11-26', '1996-11-18', 3, 1.29999995, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10353, 'PICCO', 7, '1996-11-13', '1996-12-11', '1996-11-25', 3, 360.630005, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10354, 'PERIC', 8, '1996-11-14', '1996-12-12', '1996-11-20', 3, 53.7999992, 'Pericles Comidas clásicas', 'Calle Dr. Jorge Cash 321', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10355, 'AROUT', 6, '1996-11-15', '1996-12-13', '1996-11-20', 1, 41.9500008, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10356, 'WANDK', 6, '1996-11-18', '1996-12-16', '1996-11-27', 2, 36.7099991, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10357, 'LILAS', 1, '1996-11-19', '1996-12-17', '1996-12-02', 3, 34.8800011, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10358, 'LAMAI', 5, '1996-11-20', '1996-12-18', '1996-11-27', 1, 19.6399994, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10359, 'SEVES', 5, '1996-11-21', '1996-12-19', '1996-11-26', 3, 288.429993, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10360, 'BLONP', 4, '1996-11-22', '1996-12-20', '1996-12-02', 3, 131.699997, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10361, 'QUICK', 1, '1996-11-22', '1996-12-20', '1996-12-03', 2, 183.169998, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10362, 'BONAP', 3, '1996-11-25', '1996-12-23', '1996-11-28', 1, 96.0400009, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10363, 'DRACD', 4, '1996-11-26', '1996-12-24', '1996-12-04', 3, 30.5400009, 'Drachenblut Delikatessen', 'Walserweg 21', 'Aachen', NULL, '52066', 'Germany');
INSERT INTO orders VALUES (10364, 'EASTC', 1, '1996-11-26', '1997-01-07', '1996-12-04', 1, 71.9700012, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (10365, 'ANTON', 3, '1996-11-27', '1996-12-25', '1996-12-02', 2, 22, 'Antonio Moreno Taquería', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico');
INSERT INTO orders VALUES (10366, 'GALED', 8, '1996-11-28', '1997-01-09', '1996-12-30', 2, 10.1400003, 'Galería del gastronómo', 'Rambla de Cataluña, 23', 'Barcelona', NULL, '8022', 'Spain');
INSERT INTO orders VALUES (10367, 'VAFFE', 7, '1996-11-28', '1996-12-26', '1996-12-02', 3, 13.5500002, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10368, 'ERNSH', 2, '1996-11-29', '1996-12-27', '1996-12-02', 2, 101.949997, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10369, 'SPLIR', 8, '1996-12-02', '1996-12-30', '1996-12-09', 2, 195.679993, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10370, 'CHOPS', 6, '1996-12-03', '1996-12-31', '1996-12-27', 2, 1.16999996, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (10371, 'LAMAI', 1, '1996-12-03', '1996-12-31', '1996-12-24', 1, 0.449999988, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10372, 'QUEEN', 5, '1996-12-04', '1997-01-01', '1996-12-09', 2, 890.780029, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10373, 'HUNGO', 4, '1996-12-05', '1997-01-02', '1996-12-11', 3, 124.120003, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10374, 'WOLZA', 1, '1996-12-05', '1997-01-02', '1996-12-09', 3, 3.94000006, 'Wolski Zajazd', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland');
INSERT INTO orders VALUES (10375, 'HUNGC', 3, '1996-12-06', '1997-01-03', '1996-12-09', 2, 20.1200008, 'Hungry Coyote Import Store', 'City Center Plaza 516 Main St.', 'Elgin', 'OR', '97827', 'USA');
INSERT INTO orders VALUES (10376, 'MEREP', 1, '1996-12-09', '1997-01-06', '1996-12-13', 2, 20.3899994, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10377, 'SEVES', 1, '1996-12-09', '1997-01-06', '1996-12-13', 3, 22.2099991, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10378, 'FOLKO', 5, '1996-12-10', '1997-01-07', '1996-12-19', 3, 5.44000006, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10379, 'QUEDE', 2, '1996-12-11', '1997-01-08', '1996-12-13', 1, 45.0299988, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10380, 'HUNGO', 8, '1996-12-12', '1997-01-09', '1997-01-16', 3, 35.0299988, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10381, 'LILAS', 3, '1996-12-12', '1997-01-09', '1996-12-13', 3, 7.98999977, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10382, 'ERNSH', 4, '1996-12-13', '1997-01-10', '1996-12-16', 1, 94.7699966, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10383, 'AROUT', 8, '1996-12-16', '1997-01-13', '1996-12-18', 3, 34.2400017, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10384, 'BERGS', 3, '1996-12-16', '1997-01-13', '1996-12-20', 3, 168.639999, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10385, 'SPLIR', 1, '1996-12-17', '1997-01-14', '1996-12-23', 2, 30.9599991, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10386, 'FAMIA', 9, '1996-12-18', '1997-01-01', '1996-12-25', 3, 13.9899998, 'Familia Arquibaldo', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil');
INSERT INTO orders VALUES (10387, 'SANTG', 1, '1996-12-18', '1997-01-15', '1996-12-20', 2, 93.6299973, 'Santé Gourmet', 'Erling Skakkes gate 78', 'Stavern', NULL, '4110', 'Norway');
INSERT INTO orders VALUES (10388, 'SEVES', 2, '1996-12-19', '1997-01-16', '1996-12-20', 1, 34.8600006, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10389, 'BOTTM', 4, '1996-12-20', '1997-01-17', '1996-12-24', 2, 47.4199982, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10390, 'ERNSH', 6, '1996-12-23', '1997-01-20', '1996-12-26', 1, 126.379997, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10391, 'DRACD', 3, '1996-12-23', '1997-01-20', '1996-12-31', 3, 5.44999981, 'Drachenblut Delikatessen', 'Walserweg 21', 'Aachen', NULL, '52066', 'Germany');
INSERT INTO orders VALUES (10392, 'PICCO', 2, '1996-12-24', '1997-01-21', '1997-01-01', 3, 122.459999, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10393, 'SAVEA', 1, '1996-12-25', '1997-01-22', '1997-01-03', 3, 126.559998, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10394, 'HUNGC', 1, '1996-12-25', '1997-01-22', '1997-01-03', 3, 30.3400002, 'Hungry Coyote Import Store', 'City Center Plaza 516 Main St.', 'Elgin', 'OR', '97827', 'USA');
INSERT INTO orders VALUES (10395, 'HILAA', 6, '1996-12-26', '1997-01-23', '1997-01-03', 1, 184.410004, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10396, 'FRANK', 1, '1996-12-27', '1997-01-10', '1997-01-06', 3, 135.350006, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10397, 'PRINI', 5, '1996-12-27', '1997-01-24', '1997-01-02', 1, 60.2599983, 'Princesa Isabel Vinhos', 'Estrada da saúde n. 58', 'Lisboa', NULL, '1756', 'Portugal');
INSERT INTO orders VALUES (10398, 'SAVEA', 2, '1996-12-30', '1997-01-27', '1997-01-09', 3, 89.1600037, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10399, 'VAFFE', 8, '1996-12-31', '1997-01-14', '1997-01-08', 3, 27.3600006, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10400, 'EASTC', 1, '1997-01-01', '1997-01-29', '1997-01-16', 3, 83.9300003, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (10401, 'RATTC', 1, '1997-01-01', '1997-01-29', '1997-01-10', 1, 12.5100002, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10402, 'ERNSH', 8, '1997-01-02', '1997-02-13', '1997-01-10', 2, 67.8799973, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10403, 'ERNSH', 4, '1997-01-03', '1997-01-31', '1997-01-09', 3, 73.7900009, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10404, 'MAGAA', 2, '1997-01-03', '1997-01-31', '1997-01-08', 1, 155.970001, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10405, 'LINOD', 1, '1997-01-06', '1997-02-03', '1997-01-22', 1, 34.8199997, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10406, 'QUEEN', 7, '1997-01-07', '1997-02-18', '1997-01-13', 1, 108.040001, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10407, 'OTTIK', 2, '1997-01-07', '1997-02-04', '1997-01-30', 2, 91.4800034, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10408, 'FOLIG', 8, '1997-01-08', '1997-02-05', '1997-01-14', 1, 11.2600002, 'Folies gourmandes', '184, chaussée de Tournai', 'Lille', NULL, '59000', 'France');
INSERT INTO orders VALUES (10409, 'OCEAN', 3, '1997-01-09', '1997-02-06', '1997-01-14', 1, 29.8299999, 'Océano Atlántico Ltda.', 'Ing. Gustavo Moncada 8585 Piso 20-A', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10410, 'BOTTM', 3, '1997-01-10', '1997-02-07', '1997-01-15', 3, 2.4000001, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10411, 'BOTTM', 9, '1997-01-10', '1997-02-07', '1997-01-21', 3, 23.6499996, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10412, 'WARTH', 8, '1997-01-13', '1997-02-10', '1997-01-15', 2, 3.76999998, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10413, 'LAMAI', 3, '1997-01-14', '1997-02-11', '1997-01-16', 2, 95.6600037, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10414, 'FAMIA', 2, '1997-01-14', '1997-02-11', '1997-01-17', 3, 21.4799995, 'Familia Arquibaldo', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil');
INSERT INTO orders VALUES (10415, 'HUNGC', 3, '1997-01-15', '1997-02-12', '1997-01-24', 1, 0.200000003, 'Hungry Coyote Import Store', 'City Center Plaza 516 Main St.', 'Elgin', 'OR', '97827', 'USA');
INSERT INTO orders VALUES (10416, 'WARTH', 8, '1997-01-16', '1997-02-13', '1997-01-27', 3, 22.7199993, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10417, 'SIMOB', 4, '1997-01-16', '1997-02-13', '1997-01-28', 3, 70.2900009, 'Simons bistro', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark');
INSERT INTO orders VALUES (10418, 'QUICK', 4, '1997-01-17', '1997-02-14', '1997-01-24', 1, 17.5499992, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10419, 'RICSU', 4, '1997-01-20', '1997-02-17', '1997-01-30', 2, 137.350006, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10420, 'WELLI', 3, '1997-01-21', '1997-02-18', '1997-01-27', 1, 44.1199989, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10421, 'QUEDE', 8, '1997-01-21', '1997-03-04', '1997-01-27', 1, 99.2300034, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10422, 'FRANS', 2, '1997-01-22', '1997-02-19', '1997-01-31', 1, 3.01999998, 'Franchi S.p.A.', 'Via Monte Bianco 34', 'Torino', NULL, '10100', 'Italy');
INSERT INTO orders VALUES (10423, 'GOURL', 6, '1997-01-23', '1997-02-06', '1997-02-24', 3, 24.5, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10424, 'MEREP', 7, '1997-01-23', '1997-02-20', '1997-01-27', 2, 370.609985, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10425, 'LAMAI', 6, '1997-01-24', '1997-02-21', '1997-02-14', 2, 7.92999983, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10426, 'GALED', 4, '1997-01-27', '1997-02-24', '1997-02-06', 1, 18.6900005, 'Galería del gastronómo', 'Rambla de Cataluña, 23', 'Barcelona', NULL, '8022', 'Spain');
INSERT INTO orders VALUES (10427, 'PICCO', 4, '1997-01-27', '1997-02-24', '1997-03-03', 2, 31.2900009, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10428, 'REGGC', 7, '1997-01-28', '1997-02-25', '1997-02-04', 1, 11.0900002, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10429, 'HUNGO', 3, '1997-01-29', '1997-03-12', '1997-02-07', 2, 56.6300011, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10430, 'ERNSH', 4, '1997-01-30', '1997-02-13', '1997-02-03', 1, 458.779999, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10431, 'BOTTM', 4, '1997-01-30', '1997-02-13', '1997-02-07', 2, 44.1699982, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10432, 'SPLIR', 3, '1997-01-31', '1997-02-14', '1997-02-07', 2, 4.34000015, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10433, 'PRINI', 3, '1997-02-03', '1997-03-03', '1997-03-04', 3, 73.8300018, 'Princesa Isabel Vinhos', 'Estrada da saúde n. 58', 'Lisboa', NULL, '1756', 'Portugal');
INSERT INTO orders VALUES (10434, 'FOLKO', 3, '1997-02-03', '1997-03-03', '1997-02-13', 2, 17.9200001, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10435, 'CONSH', 8, '1997-02-04', '1997-03-18', '1997-02-07', 2, 9.21000004, 'Consolidated Holdings', 'Berkeley Gardens 12  Brewery', 'London', NULL, 'WX1 6LT', 'UK');
INSERT INTO orders VALUES (10436, 'BLONP', 3, '1997-02-05', '1997-03-05', '1997-02-11', 2, 156.660004, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10437, 'WARTH', 8, '1997-02-05', '1997-03-05', '1997-02-12', 1, 19.9699993, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10438, 'TOMSP', 3, '1997-02-06', '1997-03-06', '1997-02-14', 2, 8.23999977, 'Toms Spezialitäten', 'Luisenstr. 48', 'Münster', NULL, '44087', 'Germany');
INSERT INTO orders VALUES (10439, 'MEREP', 6, '1997-02-07', '1997-03-07', '1997-02-10', 3, 4.07000017, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10440, 'SAVEA', 4, '1997-02-10', '1997-03-10', '1997-02-28', 2, 86.5299988, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10441, 'OLDWO', 3, '1997-02-10', '1997-03-24', '1997-03-14', 2, 73.0199966, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10442, 'ERNSH', 3, '1997-02-11', '1997-03-11', '1997-02-18', 2, 47.9399986, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10443, 'REGGC', 8, '1997-02-12', '1997-03-12', '1997-02-14', 1, 13.9499998, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10444, 'BERGS', 3, '1997-02-12', '1997-03-12', '1997-02-21', 3, 3.5, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10445, 'BERGS', 3, '1997-02-13', '1997-03-13', '1997-02-20', 1, 9.30000019, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10446, 'TOMSP', 6, '1997-02-14', '1997-03-14', '1997-02-19', 1, 14.6800003, 'Toms Spezialitäten', 'Luisenstr. 48', 'Münster', NULL, '44087', 'Germany');
INSERT INTO orders VALUES (10447, 'RICAR', 4, '1997-02-14', '1997-03-14', '1997-03-07', 2, 68.6600037, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10448, 'RANCH', 4, '1997-02-17', '1997-03-17', '1997-02-24', 2, 38.8199997, 'Rancho grande', 'Av. del Libertador 900', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10449, 'BLONP', 3, '1997-02-18', '1997-03-18', '1997-02-27', 2, 53.2999992, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10450, 'VICTE', 8, '1997-02-19', '1997-03-19', '1997-03-11', 2, 7.23000002, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10451, 'QUICK', 4, '1997-02-19', '1997-03-05', '1997-03-12', 3, 189.089996, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10452, 'SAVEA', 8, '1997-02-20', '1997-03-20', '1997-02-26', 1, 140.259995, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10453, 'AROUT', 1, '1997-02-21', '1997-03-21', '1997-02-26', 2, 25.3600006, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10454, 'LAMAI', 4, '1997-02-21', '1997-03-21', '1997-02-25', 3, 2.74000001, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10455, 'WARTH', 8, '1997-02-24', '1997-04-07', '1997-03-03', 2, 180.449997, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10456, 'KOENE', 8, '1997-02-25', '1997-04-08', '1997-02-28', 2, 8.11999989, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10457, 'KOENE', 2, '1997-02-25', '1997-03-25', '1997-03-03', 1, 11.5699997, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10458, 'SUPRD', 7, '1997-02-26', '1997-03-26', '1997-03-04', 3, 147.059998, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10459, 'VICTE', 4, '1997-02-27', '1997-03-27', '1997-02-28', 2, 25.0900002, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10460, 'FOLKO', 8, '1997-02-28', '1997-03-28', '1997-03-03', 1, 16.2700005, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10461, 'LILAS', 1, '1997-02-28', '1997-03-28', '1997-03-05', 3, 148.610001, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10462, 'CONSH', 2, '1997-03-03', '1997-03-31', '1997-03-18', 1, 6.17000008, 'Consolidated Holdings', 'Berkeley Gardens 12  Brewery', 'London', NULL, 'WX1 6LT', 'UK');
INSERT INTO orders VALUES (10463, 'SUPRD', 5, '1997-03-04', '1997-04-01', '1997-03-06', 3, 14.7799997, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10464, 'FURIB', 4, '1997-03-04', '1997-04-01', '1997-03-14', 2, 89, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10465, 'VAFFE', 1, '1997-03-05', '1997-04-02', '1997-03-14', 3, 145.039993, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10466, 'COMMI', 4, '1997-03-06', '1997-04-03', '1997-03-13', 1, 11.9300003, 'Comércio Mineiro', 'Av. dos Lusíadas, 23', 'Sao Paulo', 'SP', '05432-043', 'Brazil');
INSERT INTO orders VALUES (10467, 'MAGAA', 8, '1997-03-06', '1997-04-03', '1997-03-11', 2, 4.92999983, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10468, 'KOENE', 3, '1997-03-07', '1997-04-04', '1997-03-12', 3, 44.1199989, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10469, 'WHITC', 1, '1997-03-10', '1997-04-07', '1997-03-14', 1, 60.1800003, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10470, 'BONAP', 4, '1997-03-11', '1997-04-08', '1997-03-14', 2, 64.5599976, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10471, 'BSBEV', 2, '1997-03-11', '1997-04-08', '1997-03-18', 3, 45.5900002, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10472, 'SEVES', 8, '1997-03-12', '1997-04-09', '1997-03-19', 1, 4.19999981, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10473, 'ISLAT', 1, '1997-03-13', '1997-03-27', '1997-03-21', 3, 16.3700008, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10474, 'PERIC', 5, '1997-03-13', '1997-04-10', '1997-03-21', 2, 83.4899979, 'Pericles Comidas clásicas', 'Calle Dr. Jorge Cash 321', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10475, 'SUPRD', 9, '1997-03-14', '1997-04-11', '1997-04-04', 1, 68.5199966, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10476, 'HILAA', 8, '1997-03-17', '1997-04-14', '1997-03-24', 3, 4.40999985, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10477, 'PRINI', 5, '1997-03-17', '1997-04-14', '1997-03-25', 2, 13.0200005, 'Princesa Isabel Vinhos', 'Estrada da saúde n. 58', 'Lisboa', NULL, '1756', 'Portugal');
INSERT INTO orders VALUES (10478, 'VICTE', 2, '1997-03-18', '1997-04-01', '1997-03-26', 3, 4.80999994, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10479, 'RATTC', 3, '1997-03-19', '1997-04-16', '1997-03-21', 3, 708.950012, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10480, 'FOLIG', 6, '1997-03-20', '1997-04-17', '1997-03-24', 2, 1.35000002, 'Folies gourmandes', '184, chaussée de Tournai', 'Lille', NULL, '59000', 'France');
INSERT INTO orders VALUES (10481, 'RICAR', 8, '1997-03-20', '1997-04-17', '1997-03-25', 2, 64.3300018, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10482, 'LAZYK', 1, '1997-03-21', '1997-04-18', '1997-04-10', 3, 7.48000002, 'Lazy K Kountry Store', '12 Orchestra Terrace', 'Walla Walla', 'WA', '99362', 'USA');
INSERT INTO orders VALUES (10483, 'WHITC', 7, '1997-03-24', '1997-04-21', '1997-04-25', 2, 15.2799997, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10484, 'BSBEV', 3, '1997-03-24', '1997-04-21', '1997-04-01', 3, 6.88000011, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10485, 'LINOD', 4, '1997-03-25', '1997-04-08', '1997-03-31', 2, 64.4499969, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10486, 'HILAA', 1, '1997-03-26', '1997-04-23', '1997-04-02', 2, 30.5300007, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10487, 'QUEEN', 2, '1997-03-26', '1997-04-23', '1997-03-28', 2, 71.0699997, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10488, 'FRANK', 8, '1997-03-27', '1997-04-24', '1997-04-02', 2, 4.92999983, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10489, 'PICCO', 6, '1997-03-28', '1997-04-25', '1997-04-09', 2, 5.28999996, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10490, 'HILAA', 7, '1997-03-31', '1997-04-28', '1997-04-03', 2, 210.190002, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10491, 'FURIB', 8, '1997-03-31', '1997-04-28', '1997-04-08', 3, 16.9599991, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10492, 'BOTTM', 3, '1997-04-01', '1997-04-29', '1997-04-11', 1, 62.8899994, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10493, 'LAMAI', 4, '1997-04-02', '1997-04-30', '1997-04-10', 3, 10.6400003, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10494, 'COMMI', 4, '1997-04-02', '1997-04-30', '1997-04-09', 2, 65.9899979, 'Comércio Mineiro', 'Av. dos Lusíadas, 23', 'Sao Paulo', 'SP', '05432-043', 'Brazil');
INSERT INTO orders VALUES (10495, 'LAUGB', 3, '1997-04-03', '1997-05-01', '1997-04-11', 3, 4.6500001, 'Laughing Bacchus Wine Cellars', '2319 Elm St.', 'Vancouver', 'BC', 'V3F 2K1', 'Canada');
INSERT INTO orders VALUES (10496, 'TRADH', 7, '1997-04-04', '1997-05-02', '1997-04-07', 2, 46.7700005, 'Tradiçao Hipermercados', 'Av. Inês de Castro, 414', 'Sao Paulo', 'SP', '05634-030', 'Brazil');
INSERT INTO orders VALUES (10497, 'LEHMS', 7, '1997-04-04', '1997-05-02', '1997-04-07', 1, 36.2099991, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10498, 'HILAA', 8, '1997-04-07', '1997-05-05', '1997-04-11', 2, 29.75, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10499, 'LILAS', 4, '1997-04-08', '1997-05-06', '1997-04-16', 2, 102.019997, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10500, 'LAMAI', 6, '1997-04-09', '1997-05-07', '1997-04-17', 1, 42.6800003, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10501, 'BLAUS', 9, '1997-04-09', '1997-05-07', '1997-04-16', 3, 8.85000038, 'Blauer See Delikatessen', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany');
INSERT INTO orders VALUES (10502, 'PERIC', 2, '1997-04-10', '1997-05-08', '1997-04-29', 1, 69.3199997, 'Pericles Comidas clásicas', 'Calle Dr. Jorge Cash 321', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10503, 'HUNGO', 6, '1997-04-11', '1997-05-09', '1997-04-16', 2, 16.7399998, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10504, 'WHITC', 4, '1997-04-11', '1997-05-09', '1997-04-18', 3, 59.1300011, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10505, 'MEREP', 3, '1997-04-14', '1997-05-12', '1997-04-21', 3, 7.13000011, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10506, 'KOENE', 9, '1997-04-15', '1997-05-13', '1997-05-02', 2, 21.1900005, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10507, 'ANTON', 7, '1997-04-15', '1997-05-13', '1997-04-22', 1, 47.4500008, 'Antonio Moreno Taquería', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico');
INSERT INTO orders VALUES (10508, 'OTTIK', 1, '1997-04-16', '1997-05-14', '1997-05-13', 2, 4.98999977, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10509, 'BLAUS', 4, '1997-04-17', '1997-05-15', '1997-04-29', 1, 0.150000006, 'Blauer See Delikatessen', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany');
INSERT INTO orders VALUES (10510, 'SAVEA', 6, '1997-04-18', '1997-05-16', '1997-04-28', 3, 367.630005, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10511, 'BONAP', 4, '1997-04-18', '1997-05-16', '1997-04-21', 3, 350.640015, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10512, 'FAMIA', 7, '1997-04-21', '1997-05-19', '1997-04-24', 2, 3.52999997, 'Familia Arquibaldo', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil');
INSERT INTO orders VALUES (10513, 'WANDK', 7, '1997-04-22', '1997-06-03', '1997-04-28', 1, 105.650002, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10514, 'ERNSH', 3, '1997-04-22', '1997-05-20', '1997-05-16', 2, 789.950012, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10515, 'QUICK', 2, '1997-04-23', '1997-05-07', '1997-05-23', 1, 204.470001, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10516, 'HUNGO', 2, '1997-04-24', '1997-05-22', '1997-05-01', 3, 62.7799988, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10517, 'NORTS', 3, '1997-04-24', '1997-05-22', '1997-04-29', 3, 32.0699997, 'North/South', 'South House 300 Queensbridge', 'London', NULL, 'SW7 1RZ', 'UK');
INSERT INTO orders VALUES (10518, 'TORTU', 4, '1997-04-25', '1997-05-09', '1997-05-05', 2, 218.149994, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10519, 'CHOPS', 6, '1997-04-28', '1997-05-26', '1997-05-01', 3, 91.7600021, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (10520, 'SANTG', 7, '1997-04-29', '1997-05-27', '1997-05-01', 1, 13.3699999, 'Santé Gourmet', 'Erling Skakkes gate 78', 'Stavern', NULL, '4110', 'Norway');
INSERT INTO orders VALUES (10521, 'CACTU', 8, '1997-04-29', '1997-05-27', '1997-05-02', 2, 17.2199993, 'Cactus Comidas para llevar', 'Cerrito 333', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10522, 'LEHMS', 4, '1997-04-30', '1997-05-28', '1997-05-06', 1, 45.3300018, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10523, 'SEVES', 7, '1997-05-01', '1997-05-29', '1997-05-30', 2, 77.6299973, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10524, 'BERGS', 1, '1997-05-01', '1997-05-29', '1997-05-07', 2, 244.789993, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10525, 'BONAP', 1, '1997-05-02', '1997-05-30', '1997-05-23', 2, 11.0600004, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10526, 'WARTH', 4, '1997-05-05', '1997-06-02', '1997-05-15', 2, 58.5900002, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10527, 'QUICK', 7, '1997-05-05', '1997-06-02', '1997-05-07', 1, 41.9000015, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10528, 'GREAL', 6, '1997-05-06', '1997-05-20', '1997-05-09', 2, 3.3499999, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10529, 'MAISD', 5, '1997-05-07', '1997-06-04', '1997-05-09', 2, 66.6900024, 'Maison Dewey', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium');
INSERT INTO orders VALUES (10530, 'PICCO', 3, '1997-05-08', '1997-06-05', '1997-05-12', 2, 339.220001, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10531, 'OCEAN', 7, '1997-05-08', '1997-06-05', '1997-05-19', 1, 8.11999989, 'Océano Atlántico Ltda.', 'Ing. Gustavo Moncada 8585 Piso 20-A', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10532, 'EASTC', 7, '1997-05-09', '1997-06-06', '1997-05-12', 3, 74.4599991, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (10533, 'FOLKO', 8, '1997-05-12', '1997-06-09', '1997-05-22', 1, 188.039993, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10534, 'LEHMS', 8, '1997-05-12', '1997-06-09', '1997-05-14', 2, 27.9400005, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10535, 'ANTON', 4, '1997-05-13', '1997-06-10', '1997-05-21', 1, 15.6400003, 'Antonio Moreno Taquería', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico');
INSERT INTO orders VALUES (10536, 'LEHMS', 3, '1997-05-14', '1997-06-11', '1997-06-06', 2, 58.8800011, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10537, 'RICSU', 1, '1997-05-14', '1997-05-28', '1997-05-19', 1, 78.8499985, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10538, 'BSBEV', 9, '1997-05-15', '1997-06-12', '1997-05-16', 3, 4.86999989, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10539, 'BSBEV', 6, '1997-05-16', '1997-06-13', '1997-05-23', 3, 12.3599997, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10540, 'QUICK', 3, '1997-05-19', '1997-06-16', '1997-06-13', 3, 1007.64001, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10541, 'HANAR', 2, '1997-05-19', '1997-06-16', '1997-05-29', 1, 68.6500015, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10542, 'KOENE', 1, '1997-05-20', '1997-06-17', '1997-05-26', 3, 10.9499998, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10543, 'LILAS', 8, '1997-05-21', '1997-06-18', '1997-05-23', 2, 48.1699982, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10544, 'LONEP', 4, '1997-05-21', '1997-06-18', '1997-05-30', 1, 24.9099998, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (10545, 'LAZYK', 8, '1997-05-22', '1997-06-19', '1997-06-26', 2, 11.9200001, 'Lazy K Kountry Store', '12 Orchestra Terrace', 'Walla Walla', 'WA', '99362', 'USA');
INSERT INTO orders VALUES (10546, 'VICTE', 1, '1997-05-23', '1997-06-20', '1997-05-27', 3, 194.720001, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10547, 'SEVES', 3, '1997-05-23', '1997-06-20', '1997-06-02', 2, 178.429993, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10548, 'TOMSP', 3, '1997-05-26', '1997-06-23', '1997-06-02', 2, 1.42999995, 'Toms Spezialitäten', 'Luisenstr. 48', 'Münster', NULL, '44087', 'Germany');
INSERT INTO orders VALUES (10549, 'QUICK', 5, '1997-05-27', '1997-06-10', '1997-05-30', 1, 171.240005, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10550, 'GODOS', 7, '1997-05-28', '1997-06-25', '1997-06-06', 3, 4.32000017, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10551, 'FURIB', 4, '1997-05-28', '1997-07-09', '1997-06-06', 3, 72.9499969, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10552, 'HILAA', 2, '1997-05-29', '1997-06-26', '1997-06-05', 1, 83.2200012, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10553, 'WARTH', 2, '1997-05-30', '1997-06-27', '1997-06-03', 2, 149.490005, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10554, 'OTTIK', 4, '1997-05-30', '1997-06-27', '1997-06-05', 3, 120.970001, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10555, 'SAVEA', 6, '1997-06-02', '1997-06-30', '1997-06-04', 3, 252.490005, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10556, 'SIMOB', 2, '1997-06-03', '1997-07-15', '1997-06-13', 1, 9.80000019, 'Simons bistro', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark');
INSERT INTO orders VALUES (10557, 'LEHMS', 9, '1997-06-03', '1997-06-17', '1997-06-06', 2, 96.7200012, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10558, 'AROUT', 1, '1997-06-04', '1997-07-02', '1997-06-10', 2, 72.9700012, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10559, 'BLONP', 6, '1997-06-05', '1997-07-03', '1997-06-13', 1, 8.05000019, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10560, 'FRANK', 8, '1997-06-06', '1997-07-04', '1997-06-09', 1, 36.6500015, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10561, 'FOLKO', 2, '1997-06-06', '1997-07-04', '1997-06-09', 2, 242.210007, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10562, 'REGGC', 1, '1997-06-09', '1997-07-07', '1997-06-12', 1, 22.9500008, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10563, 'RICAR', 2, '1997-06-10', '1997-07-22', '1997-06-24', 2, 60.4300003, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10564, 'RATTC', 4, '1997-06-10', '1997-07-08', '1997-06-16', 3, 13.75, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10565, 'MEREP', 8, '1997-06-11', '1997-07-09', '1997-06-18', 2, 7.1500001, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10566, 'BLONP', 9, '1997-06-12', '1997-07-10', '1997-06-18', 1, 88.4000015, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10567, 'HUNGO', 1, '1997-06-12', '1997-07-10', '1997-06-17', 1, 33.9700012, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10568, 'GALED', 3, '1997-06-13', '1997-07-11', '1997-07-09', 3, 6.53999996, 'Galería del gastronómo', 'Rambla de Cataluña, 23', 'Barcelona', NULL, '8022', 'Spain');
INSERT INTO orders VALUES (10569, 'RATTC', 5, '1997-06-16', '1997-07-14', '1997-07-11', 1, 58.9799995, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10570, 'MEREP', 3, '1997-06-17', '1997-07-15', '1997-06-19', 3, 188.990005, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10571, 'ERNSH', 8, '1997-06-17', '1997-07-29', '1997-07-04', 3, 26.0599995, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10572, 'BERGS', 3, '1997-06-18', '1997-07-16', '1997-06-25', 2, 116.43, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10573, 'ANTON', 7, '1997-06-19', '1997-07-17', '1997-06-20', 3, 84.8399963, 'Antonio Moreno Taquería', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico');
INSERT INTO orders VALUES (10574, 'TRAIH', 4, '1997-06-19', '1997-07-17', '1997-06-30', 2, 37.5999985, 'Trail''s Head Gourmet Provisioners', '722 DaVinci Blvd.', 'Kirkland', 'WA', '98034', 'USA');
INSERT INTO orders VALUES (10575, 'MORGK', 5, '1997-06-20', '1997-07-04', '1997-06-30', 1, 127.339996, 'Morgenstern Gesundkost', 'Heerstr. 22', 'Leipzig', NULL, '04179', 'Germany');
INSERT INTO orders VALUES (10576, 'TORTU', 3, '1997-06-23', '1997-07-07', '1997-06-30', 3, 18.5599995, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10577, 'TRAIH', 9, '1997-06-23', '1997-08-04', '1997-06-30', 2, 25.4099998, 'Trail''s Head Gourmet Provisioners', '722 DaVinci Blvd.', 'Kirkland', 'WA', '98034', 'USA');
INSERT INTO orders VALUES (10578, 'BSBEV', 4, '1997-06-24', '1997-07-22', '1997-07-25', 3, 29.6000004, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10579, 'LETSS', 1, '1997-06-25', '1997-07-23', '1997-07-04', 2, 13.7299995, 'Let''s Stop N Shop', '87 Polk St. Suite 5', 'San Francisco', 'CA', '94117', 'USA');
INSERT INTO orders VALUES (10580, 'OTTIK', 4, '1997-06-26', '1997-07-24', '1997-07-01', 3, 75.8899994, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10581, 'FAMIA', 3, '1997-06-26', '1997-07-24', '1997-07-02', 1, 3.00999999, 'Familia Arquibaldo', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil');
INSERT INTO orders VALUES (10582, 'BLAUS', 3, '1997-06-27', '1997-07-25', '1997-07-14', 2, 27.7099991, 'Blauer See Delikatessen', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany');
INSERT INTO orders VALUES (10583, 'WARTH', 2, '1997-06-30', '1997-07-28', '1997-07-04', 2, 7.28000021, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10584, 'BLONP', 4, '1997-06-30', '1997-07-28', '1997-07-04', 1, 59.1399994, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10585, 'WELLI', 7, '1997-07-01', '1997-07-29', '1997-07-10', 1, 13.4099998, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10586, 'REGGC', 9, '1997-07-02', '1997-07-30', '1997-07-09', 1, 0.479999989, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10587, 'QUEDE', 1, '1997-07-02', '1997-07-30', '1997-07-09', 1, 62.5200005, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10588, 'QUICK', 2, '1997-07-03', '1997-07-31', '1997-07-10', 3, 194.669998, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10589, 'GREAL', 8, '1997-07-04', '1997-08-01', '1997-07-14', 2, 4.42000008, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10590, 'MEREP', 4, '1997-07-07', '1997-08-04', '1997-07-14', 3, 44.7700005, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10591, 'VAFFE', 1, '1997-07-07', '1997-07-21', '1997-07-16', 1, 55.9199982, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10592, 'LEHMS', 3, '1997-07-08', '1997-08-05', '1997-07-16', 1, 32.0999985, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10593, 'LEHMS', 7, '1997-07-09', '1997-08-06', '1997-08-13', 2, 174.199997, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10594, 'OLDWO', 3, '1997-07-09', '1997-08-06', '1997-07-16', 2, 5.23999977, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10595, 'ERNSH', 2, '1997-07-10', '1997-08-07', '1997-07-14', 1, 96.7799988, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10596, 'WHITC', 8, '1997-07-11', '1997-08-08', '1997-08-12', 1, 16.3400002, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10597, 'PICCO', 7, '1997-07-11', '1997-08-08', '1997-07-18', 3, 35.1199989, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10598, 'RATTC', 1, '1997-07-14', '1997-08-11', '1997-07-18', 3, 44.4199982, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10599, 'BSBEV', 6, '1997-07-15', '1997-08-26', '1997-07-21', 3, 29.9799995, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10600, 'HUNGC', 4, '1997-07-16', '1997-08-13', '1997-07-21', 1, 45.1300011, 'Hungry Coyote Import Store', 'City Center Plaza 516 Main St.', 'Elgin', 'OR', '97827', 'USA');
INSERT INTO orders VALUES (10601, 'HILAA', 7, '1997-07-16', '1997-08-27', '1997-07-22', 1, 58.2999992, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10602, 'VAFFE', 8, '1997-07-17', '1997-08-14', '1997-07-22', 2, 2.92000008, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10603, 'SAVEA', 8, '1997-07-18', '1997-08-15', '1997-08-08', 2, 48.7700005, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10604, 'FURIB', 1, '1997-07-18', '1997-08-15', '1997-07-29', 1, 7.46000004, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10605, 'MEREP', 1, '1997-07-21', '1997-08-18', '1997-07-29', 2, 379.130005, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10606, 'TRADH', 4, '1997-07-22', '1997-08-19', '1997-07-31', 3, 79.4000015, 'Tradiçao Hipermercados', 'Av. Inês de Castro, 414', 'Sao Paulo', 'SP', '05634-030', 'Brazil');
INSERT INTO orders VALUES (10607, 'SAVEA', 5, '1997-07-22', '1997-08-19', '1997-07-25', 1, 200.240005, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10608, 'TOMSP', 4, '1997-07-23', '1997-08-20', '1997-08-01', 2, 27.7900009, 'Toms Spezialitäten', 'Luisenstr. 48', 'Münster', NULL, '44087', 'Germany');
INSERT INTO orders VALUES (10609, 'DUMON', 7, '1997-07-24', '1997-08-21', '1997-07-30', 2, 1.85000002, 'Du monde entier', '67, rue des Cinquante Otages', 'Nantes', NULL, '44000', 'France');
INSERT INTO orders VALUES (10610, 'LAMAI', 8, '1997-07-25', '1997-08-22', '1997-08-06', 1, 26.7800007, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10611, 'WOLZA', 6, '1997-07-25', '1997-08-22', '1997-08-01', 2, 80.6500015, 'Wolski Zajazd', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland');
INSERT INTO orders VALUES (10612, 'SAVEA', 1, '1997-07-28', '1997-08-25', '1997-08-01', 2, 544.080017, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10613, 'HILAA', 4, '1997-07-29', '1997-08-26', '1997-08-01', 2, 8.10999966, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10614, 'BLAUS', 8, '1997-07-29', '1997-08-26', '1997-08-01', 3, 1.92999995, 'Blauer See Delikatessen', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany');
INSERT INTO orders VALUES (10615, 'WILMK', 2, '1997-07-30', '1997-08-27', '1997-08-06', 3, 0.75, 'Wilman Kala', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland');
INSERT INTO orders VALUES (10616, 'GREAL', 1, '1997-07-31', '1997-08-28', '1997-08-05', 2, 116.529999, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10617, 'GREAL', 4, '1997-07-31', '1997-08-28', '1997-08-04', 2, 18.5300007, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10618, 'MEREP', 1, '1997-08-01', '1997-09-12', '1997-08-08', 1, 154.679993, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10619, 'MEREP', 3, '1997-08-04', '1997-09-01', '1997-08-07', 3, 91.0500031, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10620, 'LAUGB', 2, '1997-08-05', '1997-09-02', '1997-08-14', 3, 0.939999998, 'Laughing Bacchus Wine Cellars', '2319 Elm St.', 'Vancouver', 'BC', 'V3F 2K1', 'Canada');
INSERT INTO orders VALUES (10621, 'ISLAT', 4, '1997-08-05', '1997-09-02', '1997-08-11', 2, 23.7299995, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10622, 'RICAR', 4, '1997-08-06', '1997-09-03', '1997-08-11', 3, 50.9700012, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10623, 'FRANK', 8, '1997-08-07', '1997-09-04', '1997-08-12', 2, 97.1800003, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10624, 'THECR', 4, '1997-08-07', '1997-09-04', '1997-08-19', 2, 94.8000031, 'The Cracker Box', '55 Grizzly Peak Rd.', 'Butte', 'MT', '59801', 'USA');
INSERT INTO orders VALUES (10625, 'ANATR', 3, '1997-08-08', '1997-09-05', '1997-08-14', 1, 43.9000015, 'Ana Trujillo Emparedados y helados', 'Avda. de la Constitución 2222', 'México D.F.', NULL, '05021', 'Mexico');
INSERT INTO orders VALUES (10626, 'BERGS', 1, '1997-08-11', '1997-09-08', '1997-08-20', 2, 138.690002, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10627, 'SAVEA', 8, '1997-08-11', '1997-09-22', '1997-08-21', 3, 107.459999, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10628, 'BLONP', 4, '1997-08-12', '1997-09-09', '1997-08-20', 3, 30.3600006, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10629, 'GODOS', 4, '1997-08-12', '1997-09-09', '1997-08-20', 3, 85.4599991, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10630, 'KOENE', 1, '1997-08-13', '1997-09-10', '1997-08-19', 2, 32.3499985, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10631, 'LAMAI', 8, '1997-08-14', '1997-09-11', '1997-08-15', 1, 0.870000005, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10632, 'WANDK', 8, '1997-08-14', '1997-09-11', '1997-08-19', 1, 41.3800011, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10633, 'ERNSH', 7, '1997-08-15', '1997-09-12', '1997-08-18', 3, 477.899994, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10634, 'FOLIG', 4, '1997-08-15', '1997-09-12', '1997-08-21', 3, 487.380005, 'Folies gourmandes', '184, chaussée de Tournai', 'Lille', NULL, '59000', 'France');
INSERT INTO orders VALUES (10635, 'MAGAA', 8, '1997-08-18', '1997-09-15', '1997-08-21', 3, 47.4599991, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10636, 'WARTH', 4, '1997-08-19', '1997-09-16', '1997-08-26', 1, 1.14999998, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10637, 'QUEEN', 6, '1997-08-19', '1997-09-16', '1997-08-26', 1, 201.289993, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10638, 'LINOD', 3, '1997-08-20', '1997-09-17', '1997-09-01', 1, 158.440002, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10639, 'SANTG', 7, '1997-08-20', '1997-09-17', '1997-08-27', 3, 38.6399994, 'Santé Gourmet', 'Erling Skakkes gate 78', 'Stavern', NULL, '4110', 'Norway');
INSERT INTO orders VALUES (10640, 'WANDK', 4, '1997-08-21', '1997-09-18', '1997-08-28', 1, 23.5499992, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10641, 'HILAA', 4, '1997-08-22', '1997-09-19', '1997-08-26', 2, 179.610001, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10642, 'SIMOB', 7, '1997-08-22', '1997-09-19', '1997-09-05', 3, 41.8899994, 'Simons bistro', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark');
INSERT INTO orders VALUES (10643, 'ALFKI', 6, '1997-08-25', '1997-09-22', '1997-09-02', 1, 29.4599991, 'Alfreds Futterkiste', 'Obere Str. 57', 'Berlin', NULL, '12209', 'Germany');
INSERT INTO orders VALUES (10644, 'WELLI', 3, '1997-08-25', '1997-09-22', '1997-09-01', 2, 0.140000001, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10645, 'HANAR', 4, '1997-08-26', '1997-09-23', '1997-09-02', 1, 12.4099998, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10646, 'HUNGO', 9, '1997-08-27', '1997-10-08', '1997-09-03', 3, 142.330002, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10647, 'QUEDE', 4, '1997-08-27', '1997-09-10', '1997-09-03', 2, 45.5400009, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10648, 'RICAR', 5, '1997-08-28', '1997-10-09', '1997-09-09', 2, 14.25, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10649, 'MAISD', 5, '1997-08-28', '1997-09-25', '1997-08-29', 3, 6.19999981, 'Maison Dewey', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium');
INSERT INTO orders VALUES (10650, 'FAMIA', 5, '1997-08-29', '1997-09-26', '1997-09-03', 3, 176.809998, 'Familia Arquibaldo', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil');
INSERT INTO orders VALUES (10651, 'WANDK', 8, '1997-09-01', '1997-09-29', '1997-09-11', 2, 20.6000004, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10652, 'GOURL', 4, '1997-09-01', '1997-09-29', '1997-09-08', 2, 7.13999987, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10653, 'FRANK', 1, '1997-09-02', '1997-09-30', '1997-09-19', 1, 93.25, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10654, 'BERGS', 5, '1997-09-02', '1997-09-30', '1997-09-11', 1, 55.2599983, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10655, 'REGGC', 1, '1997-09-03', '1997-10-01', '1997-09-11', 2, 4.40999985, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10656, 'GREAL', 6, '1997-09-04', '1997-10-02', '1997-09-10', 1, 57.1500015, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10657, 'SAVEA', 2, '1997-09-04', '1997-10-02', '1997-09-15', 2, 352.690002, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10658, 'QUICK', 4, '1997-09-05', '1997-10-03', '1997-09-08', 1, 364.149994, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10659, 'QUEEN', 7, '1997-09-05', '1997-10-03', '1997-09-10', 2, 105.809998, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10660, 'HUNGC', 8, '1997-09-08', '1997-10-06', '1997-10-15', 1, 111.290001, 'Hungry Coyote Import Store', 'City Center Plaza 516 Main St.', 'Elgin', 'OR', '97827', 'USA');
INSERT INTO orders VALUES (10661, 'HUNGO', 7, '1997-09-09', '1997-10-07', '1997-09-15', 3, 17.5499992, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10662, 'LONEP', 3, '1997-09-09', '1997-10-07', '1997-09-18', 2, 1.27999997, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (10663, 'BONAP', 2, '1997-09-10', '1997-09-24', '1997-10-03', 2, 113.150002, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10664, 'FURIB', 1, '1997-09-10', '1997-10-08', '1997-09-19', 3, 1.26999998, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10665, 'LONEP', 1, '1997-09-11', '1997-10-09', '1997-09-17', 2, 26.3099995, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (10666, 'RICSU', 7, '1997-09-12', '1997-10-10', '1997-09-22', 2, 232.419998, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10667, 'ERNSH', 7, '1997-09-12', '1997-10-10', '1997-09-19', 1, 78.0899963, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10668, 'WANDK', 1, '1997-09-15', '1997-10-13', '1997-09-23', 2, 47.2200012, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (10669, 'SIMOB', 2, '1997-09-15', '1997-10-13', '1997-09-22', 1, 24.3899994, 'Simons bistro', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark');
INSERT INTO orders VALUES (10670, 'FRANK', 4, '1997-09-16', '1997-10-14', '1997-09-18', 1, 203.479996, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10671, 'FRANR', 1, '1997-09-17', '1997-10-15', '1997-09-24', 1, 30.3400002, 'France restauration', '54, rue Royale', 'Nantes', NULL, '44000', 'France');
INSERT INTO orders VALUES (10672, 'BERGS', 9, '1997-09-17', '1997-10-01', '1997-09-26', 2, 95.75, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10673, 'WILMK', 2, '1997-09-18', '1997-10-16', '1997-09-19', 1, 22.7600002, 'Wilman Kala', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland');
INSERT INTO orders VALUES (10674, 'ISLAT', 4, '1997-09-18', '1997-10-16', '1997-09-30', 2, 0.899999976, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10675, 'FRANK', 5, '1997-09-19', '1997-10-17', '1997-09-23', 2, 31.8500004, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10676, 'TORTU', 2, '1997-09-22', '1997-10-20', '1997-09-29', 2, 2.00999999, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10677, 'ANTON', 1, '1997-09-22', '1997-10-20', '1997-09-26', 3, 4.03000021, 'Antonio Moreno Taquería', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico');
INSERT INTO orders VALUES (10678, 'SAVEA', 7, '1997-09-23', '1997-10-21', '1997-10-16', 3, 388.980011, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10679, 'BLONP', 8, '1997-09-23', '1997-10-21', '1997-09-30', 3, 27.9400005, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10680, 'OLDWO', 1, '1997-09-24', '1997-10-22', '1997-09-26', 1, 26.6100006, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10681, 'GREAL', 3, '1997-09-25', '1997-10-23', '1997-09-30', 3, 76.1299973, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10682, 'ANTON', 3, '1997-09-25', '1997-10-23', '1997-10-01', 2, 36.1300011, 'Antonio Moreno Taquería', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico');
INSERT INTO orders VALUES (10683, 'DUMON', 2, '1997-09-26', '1997-10-24', '1997-10-01', 1, 4.4000001, 'Du monde entier', '67, rue des Cinquante Otages', 'Nantes', NULL, '44000', 'France');
INSERT INTO orders VALUES (10684, 'OTTIK', 3, '1997-09-26', '1997-10-24', '1997-09-30', 1, 145.630005, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10685, 'GOURL', 4, '1997-09-29', '1997-10-13', '1997-10-03', 2, 33.75, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10686, 'PICCO', 2, '1997-09-30', '1997-10-28', '1997-10-08', 1, 96.5, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10687, 'HUNGO', 9, '1997-09-30', '1997-10-28', '1997-10-30', 2, 296.429993, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10688, 'VAFFE', 4, '1997-10-01', '1997-10-15', '1997-10-07', 2, 299.089996, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10689, 'BERGS', 1, '1997-10-01', '1997-10-29', '1997-10-07', 2, 13.4200001, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10690, 'HANAR', 1, '1997-10-02', '1997-10-30', '1997-10-03', 1, 15.8000002, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10691, 'QUICK', 2, '1997-10-03', '1997-11-14', '1997-10-22', 2, 810.049988, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10692, 'ALFKI', 4, '1997-10-03', '1997-10-31', '1997-10-13', 2, 61.0200005, 'Alfred''s Futterkiste', 'Obere Str. 57', 'Berlin', NULL, '12209', 'Germany');
INSERT INTO orders VALUES (10693, 'WHITC', 3, '1997-10-06', '1997-10-20', '1997-10-10', 3, 139.339996, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10694, 'QUICK', 8, '1997-10-06', '1997-11-03', '1997-10-09', 3, 398.359985, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10695, 'WILMK', 7, '1997-10-07', '1997-11-18', '1997-10-14', 1, 16.7199993, 'Wilman Kala', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland');
INSERT INTO orders VALUES (10696, 'WHITC', 8, '1997-10-08', '1997-11-19', '1997-10-14', 3, 102.550003, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10697, 'LINOD', 3, '1997-10-08', '1997-11-05', '1997-10-14', 1, 45.5200005, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10698, 'ERNSH', 4, '1997-10-09', '1997-11-06', '1997-10-17', 1, 272.470001, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10699, 'MORGK', 3, '1997-10-09', '1997-11-06', '1997-10-13', 3, 0.579999983, 'Morgenstern Gesundkost', 'Heerstr. 22', 'Leipzig', NULL, '04179', 'Germany');
INSERT INTO orders VALUES (10700, 'SAVEA', 3, '1997-10-10', '1997-11-07', '1997-10-16', 1, 65.0999985, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10701, 'HUNGO', 6, '1997-10-13', '1997-10-27', '1997-10-15', 3, 220.309998, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10702, 'ALFKI', 4, '1997-10-13', '1997-11-24', '1997-10-21', 1, 23.9400005, 'Alfred''s Futterkiste', 'Obere Str. 57', 'Berlin', NULL, '12209', 'Germany');
INSERT INTO orders VALUES (10703, 'FOLKO', 6, '1997-10-14', '1997-11-11', '1997-10-20', 2, 152.300003, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10704, 'QUEEN', 6, '1997-10-14', '1997-11-11', '1997-11-07', 1, 4.78000021, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10705, 'HILAA', 9, '1997-10-15', '1997-11-12', '1997-11-18', 2, 3.51999998, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10706, 'OLDWO', 8, '1997-10-16', '1997-11-13', '1997-10-21', 3, 135.630005, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10707, 'AROUT', 4, '1997-10-16', '1997-10-30', '1997-10-23', 3, 21.7399998, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10708, 'THEBI', 6, '1997-10-17', '1997-11-28', '1997-11-05', 2, 2.96000004, 'The Big Cheese', '89 Jefferson Way Suite 2', 'Portland', 'OR', '97201', 'USA');
INSERT INTO orders VALUES (10709, 'GOURL', 1, '1997-10-17', '1997-11-14', '1997-11-20', 3, 210.800003, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10710, 'FRANS', 1, '1997-10-20', '1997-11-17', '1997-10-23', 1, 4.98000002, 'Franchi S.p.A.', 'Via Monte Bianco 34', 'Torino', NULL, '10100', 'Italy');
INSERT INTO orders VALUES (10711, 'SAVEA', 5, '1997-10-21', '1997-12-02', '1997-10-29', 2, 52.4099998, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10712, 'HUNGO', 3, '1997-10-21', '1997-11-18', '1997-10-31', 1, 89.9300003, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10713, 'SAVEA', 1, '1997-10-22', '1997-11-19', '1997-10-24', 1, 167.050003, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10714, 'SAVEA', 5, '1997-10-22', '1997-11-19', '1997-10-27', 3, 24.4899998, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10715, 'BONAP', 3, '1997-10-23', '1997-11-06', '1997-10-29', 1, 63.2000008, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10716, 'RANCH', 4, '1997-10-24', '1997-11-21', '1997-10-27', 2, 22.5699997, 'Rancho grande', 'Av. del Libertador 900', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10717, 'FRANK', 1, '1997-10-24', '1997-11-21', '1997-10-29', 2, 59.25, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10718, 'KOENE', 1, '1997-10-27', '1997-11-24', '1997-10-29', 3, 170.880005, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10719, 'LETSS', 8, '1997-10-27', '1997-11-24', '1997-11-05', 2, 51.4399986, 'Let''s Stop N Shop', '87 Polk St. Suite 5', 'San Francisco', 'CA', '94117', 'USA');
INSERT INTO orders VALUES (10720, 'QUEDE', 8, '1997-10-28', '1997-11-11', '1997-11-05', 2, 9.52999973, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10721, 'QUICK', 5, '1997-10-29', '1997-11-26', '1997-10-31', 3, 48.9199982, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10722, 'SAVEA', 8, '1997-10-29', '1997-12-10', '1997-11-04', 1, 74.5800018, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10723, 'WHITC', 3, '1997-10-30', '1997-11-27', '1997-11-25', 1, 21.7199993, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10724, 'MEREP', 8, '1997-10-30', '1997-12-11', '1997-11-05', 2, 57.75, 'Mère Paillarde', '43 rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada');
INSERT INTO orders VALUES (10725, 'FAMIA', 4, '1997-10-31', '1997-11-28', '1997-11-05', 3, 10.8299999, 'Familia Arquibaldo', 'Rua Orós, 92', 'Sao Paulo', 'SP', '05442-030', 'Brazil');
INSERT INTO orders VALUES (10726, 'EASTC', 4, '1997-11-03', '1997-11-17', '1997-12-05', 1, 16.5599995, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (10727, 'REGGC', 2, '1997-11-03', '1997-12-01', '1997-12-05', 1, 89.9000015, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10728, 'QUEEN', 4, '1997-11-04', '1997-12-02', '1997-11-11', 2, 58.3300018, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10729, 'LINOD', 8, '1997-11-04', '1997-12-16', '1997-11-14', 3, 141.059998, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10730, 'BONAP', 5, '1997-11-05', '1997-12-03', '1997-11-14', 1, 20.1200008, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10731, 'CHOPS', 7, '1997-11-06', '1997-12-04', '1997-11-14', 1, 96.6500015, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (10732, 'BONAP', 3, '1997-11-06', '1997-12-04', '1997-11-07', 1, 16.9699993, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10733, 'BERGS', 1, '1997-11-07', '1997-12-05', '1997-11-10', 3, 110.110001, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10734, 'GOURL', 2, '1997-11-07', '1997-12-05', '1997-11-12', 3, 1.63, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10735, 'LETSS', 6, '1997-11-10', '1997-12-08', '1997-11-21', 2, 45.9700012, 'Let''s Stop N Shop', '87 Polk St. Suite 5', 'San Francisco', 'CA', '94117', 'USA');
INSERT INTO orders VALUES (10736, 'HUNGO', 9, '1997-11-11', '1997-12-09', '1997-11-21', 2, 44.0999985, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10737, 'VINET', 2, '1997-11-11', '1997-12-09', '1997-11-18', 2, 7.78999996, 'Vins et alcools Chevalier', '59 rue de l''Abbaye', 'Reims', NULL, '51100', 'France');
INSERT INTO orders VALUES (10738, 'SPECD', 2, '1997-11-12', '1997-12-10', '1997-11-18', 1, 2.91000009, 'Spécialités du monde', '25, rue Lauriston', 'Paris', NULL, '75016', 'France');
INSERT INTO orders VALUES (10739, 'VINET', 3, '1997-11-12', '1997-12-10', '1997-11-17', 3, 11.0799999, 'Vins et alcools Chevalier', '59 rue de l''Abbaye', 'Reims', NULL, '51100', 'France');
INSERT INTO orders VALUES (10740, 'WHITC', 4, '1997-11-13', '1997-12-11', '1997-11-25', 2, 81.8799973, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10741, 'AROUT', 4, '1997-11-14', '1997-11-28', '1997-11-18', 3, 10.96, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10742, 'BOTTM', 3, '1997-11-14', '1997-12-12', '1997-11-18', 3, 243.729996, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10743, 'AROUT', 1, '1997-11-17', '1997-12-15', '1997-11-21', 2, 23.7199993, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10744, 'VAFFE', 6, '1997-11-17', '1997-12-15', '1997-11-24', 1, 69.1900024, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10745, 'QUICK', 9, '1997-11-18', '1997-12-16', '1997-11-27', 1, 3.51999998, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10746, 'CHOPS', 1, '1997-11-19', '1997-12-17', '1997-11-21', 3, 31.4300003, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (10747, 'PICCO', 6, '1997-11-19', '1997-12-17', '1997-11-26', 1, 117.330002, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10748, 'SAVEA', 3, '1997-11-20', '1997-12-18', '1997-11-28', 1, 232.550003, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10749, 'ISLAT', 4, '1997-11-20', '1997-12-18', '1997-12-19', 2, 61.5299988, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10750, 'WARTH', 9, '1997-11-21', '1997-12-19', '1997-11-24', 1, 79.3000031, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10751, 'RICSU', 3, '1997-11-24', '1997-12-22', '1997-12-03', 3, 130.789993, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10752, 'NORTS', 2, '1997-11-24', '1997-12-22', '1997-11-28', 3, 1.38999999, 'North/South', 'South House 300 Queensbridge', 'London', NULL, 'SW7 1RZ', 'UK');
INSERT INTO orders VALUES (10753, 'FRANS', 3, '1997-11-25', '1997-12-23', '1997-11-27', 1, 7.69999981, 'Franchi S.p.A.', 'Via Monte Bianco 34', 'Torino', NULL, '10100', 'Italy');
INSERT INTO orders VALUES (10754, 'MAGAA', 6, '1997-11-25', '1997-12-23', '1997-11-27', 3, 2.38000011, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10755, 'BONAP', 4, '1997-11-26', '1997-12-24', '1997-11-28', 2, 16.7099991, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10756, 'SPLIR', 8, '1997-11-27', '1997-12-25', '1997-12-02', 2, 73.2099991, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10757, 'SAVEA', 6, '1997-11-27', '1997-12-25', '1997-12-15', 1, 8.18999958, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10758, 'RICSU', 3, '1997-11-28', '1997-12-26', '1997-12-04', 3, 138.169998, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10759, 'ANATR', 3, '1997-11-28', '1997-12-26', '1997-12-12', 3, 11.9899998, 'Ana Trujillo Emparedados y helados', 'Avda. de la Constitución 2222', 'México D.F.', NULL, '05021', 'Mexico');
INSERT INTO orders VALUES (10760, 'MAISD', 4, '1997-12-01', '1997-12-29', '1997-12-10', 1, 155.639999, 'Maison Dewey', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium');
INSERT INTO orders VALUES (10761, 'RATTC', 5, '1997-12-02', '1997-12-30', '1997-12-08', 2, 18.6599998, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10762, 'FOLKO', 3, '1997-12-02', '1997-12-30', '1997-12-09', 1, 328.73999, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10763, 'FOLIG', 3, '1997-12-03', '1997-12-31', '1997-12-08', 3, 37.3499985, 'Folies gourmandes', '184, chaussée de Tournai', 'Lille', NULL, '59000', 'France');
INSERT INTO orders VALUES (10764, 'ERNSH', 6, '1997-12-03', '1997-12-31', '1997-12-08', 3, 145.449997, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10765, 'QUICK', 3, '1997-12-04', '1998-01-01', '1997-12-09', 3, 42.7400017, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10766, 'OTTIK', 4, '1997-12-05', '1998-01-02', '1997-12-09', 1, 157.550003, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10767, 'SUPRD', 4, '1997-12-05', '1998-01-02', '1997-12-15', 3, 1.59000003, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10768, 'AROUT', 3, '1997-12-08', '1998-01-05', '1997-12-15', 2, 146.320007, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10769, 'VAFFE', 3, '1997-12-08', '1998-01-05', '1997-12-12', 1, 65.0599976, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10770, 'HANAR', 8, '1997-12-09', '1998-01-06', '1997-12-17', 3, 5.32000017, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10771, 'ERNSH', 9, '1997-12-10', '1998-01-07', '1998-01-02', 2, 11.1899996, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10772, 'LEHMS', 3, '1997-12-10', '1998-01-07', '1997-12-19', 2, 91.2799988, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10773, 'ERNSH', 1, '1997-12-11', '1998-01-08', '1997-12-16', 3, 96.4300003, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10774, 'FOLKO', 4, '1997-12-11', '1997-12-25', '1997-12-12', 1, 48.2000008, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10775, 'THECR', 7, '1997-12-12', '1998-01-09', '1997-12-26', 1, 20.25, 'The Cracker Box', '55 Grizzly Peak Rd.', 'Butte', 'MT', '59801', 'USA');
INSERT INTO orders VALUES (10776, 'ERNSH', 1, '1997-12-15', '1998-01-12', '1997-12-18', 3, 351.529999, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10777, 'GOURL', 7, '1997-12-15', '1997-12-29', '1998-01-21', 2, 3.00999999, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10778, 'BERGS', 3, '1997-12-16', '1998-01-13', '1997-12-24', 1, 6.78999996, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10779, 'MORGK', 3, '1997-12-16', '1998-01-13', '1998-01-14', 2, 58.1300011, 'Morgenstern Gesundkost', 'Heerstr. 22', 'Leipzig', NULL, '04179', 'Germany');
INSERT INTO orders VALUES (10780, 'LILAS', 2, '1997-12-16', '1997-12-30', '1997-12-25', 1, 42.1300011, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10781, 'WARTH', 2, '1997-12-17', '1998-01-14', '1997-12-19', 3, 73.1600037, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (10782, 'CACTU', 9, '1997-12-17', '1998-01-14', '1997-12-22', 3, 1.10000002, 'Cactus Comidas para llevar', 'Cerrito 333', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10783, 'HANAR', 4, '1997-12-18', '1998-01-15', '1997-12-19', 2, 124.980003, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10784, 'MAGAA', 4, '1997-12-18', '1998-01-15', '1997-12-22', 3, 70.0899963, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10785, 'GROSR', 1, '1997-12-18', '1998-01-15', '1997-12-24', 3, 1.50999999, 'GROSELLA-Restaurante', '5ª Ave. Los Palos Grandes', 'Caracas', 'DF', '1081', 'Venezuela');
INSERT INTO orders VALUES (10786, 'QUEEN', 8, '1997-12-19', '1998-01-16', '1997-12-23', 1, 110.870003, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10787, 'LAMAI', 2, '1997-12-19', '1998-01-02', '1997-12-26', 1, 249.929993, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10788, 'QUICK', 1, '1997-12-22', '1998-01-19', '1998-01-19', 2, 42.7000008, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10789, 'FOLIG', 1, '1997-12-22', '1998-01-19', '1997-12-31', 2, 100.599998, 'Folies gourmandes', '184, chaussée de Tournai', 'Lille', NULL, '59000', 'France');
INSERT INTO orders VALUES (10790, 'GOURL', 6, '1997-12-22', '1998-01-19', '1997-12-26', 1, 28.2299995, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10791, 'FRANK', 6, '1997-12-23', '1998-01-20', '1998-01-01', 2, 16.8500004, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10792, 'WOLZA', 1, '1997-12-23', '1998-01-20', '1997-12-31', 3, 23.7900009, 'Wolski Zajazd', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland');
INSERT INTO orders VALUES (10793, 'AROUT', 3, '1997-12-24', '1998-01-21', '1998-01-08', 3, 4.51999998, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10794, 'QUEDE', 6, '1997-12-24', '1998-01-21', '1998-01-02', 1, 21.4899998, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10795, 'ERNSH', 8, '1997-12-24', '1998-01-21', '1998-01-20', 2, 126.660004, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10796, 'HILAA', 3, '1997-12-25', '1998-01-22', '1998-01-14', 1, 26.5200005, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10797, 'DRACD', 7, '1997-12-25', '1998-01-22', '1998-01-05', 2, 33.3499985, 'Drachenblut Delikatessen', 'Walserweg 21', 'Aachen', NULL, '52066', 'Germany');
INSERT INTO orders VALUES (10798, 'ISLAT', 2, '1997-12-26', '1998-01-23', '1998-01-05', 1, 2.32999992, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10799, 'KOENE', 9, '1997-12-26', '1998-02-06', '1998-01-05', 3, 30.7600002, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10800, 'SEVES', 1, '1997-12-26', '1998-01-23', '1998-01-05', 3, 137.440002, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10801, 'BOLID', 4, '1997-12-29', '1998-01-26', '1997-12-31', 2, 97.0899963, 'Bólido Comidas preparadas', 'C/ Araquil, 67', 'Madrid', NULL, '28023', 'Spain');
INSERT INTO orders VALUES (10802, 'SIMOB', 4, '1997-12-29', '1998-01-26', '1998-01-02', 2, 257.26001, 'Simons bistro', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark');
INSERT INTO orders VALUES (10803, 'WELLI', 4, '1997-12-30', '1998-01-27', '1998-01-06', 1, 55.2299995, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10804, 'SEVES', 6, '1997-12-30', '1998-01-27', '1998-01-07', 2, 27.3299999, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10805, 'THEBI', 2, '1997-12-30', '1998-01-27', '1998-01-09', 3, 237.339996, 'The Big Cheese', '89 Jefferson Way Suite 2', 'Portland', 'OR', '97201', 'USA');
INSERT INTO orders VALUES (10806, 'VICTE', 3, '1997-12-31', '1998-01-28', '1998-01-05', 2, 22.1100006, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10807, 'FRANS', 4, '1997-12-31', '1998-01-28', '1998-01-30', 1, 1.36000001, 'Franchi S.p.A.', 'Via Monte Bianco 34', 'Torino', NULL, '10100', 'Italy');
INSERT INTO orders VALUES (10808, 'OLDWO', 2, '1998-01-01', '1998-01-29', '1998-01-09', 3, 45.5299988, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10809, 'WELLI', 7, '1998-01-01', '1998-01-29', '1998-01-07', 1, 4.86999989, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10810, 'LAUGB', 2, '1998-01-01', '1998-01-29', '1998-01-07', 3, 4.32999992, 'Laughing Bacchus Wine Cellars', '2319 Elm St.', 'Vancouver', 'BC', 'V3F 2K1', 'Canada');
INSERT INTO orders VALUES (10811, 'LINOD', 8, '1998-01-02', '1998-01-30', '1998-01-08', 1, 31.2199993, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10812, 'REGGC', 5, '1998-01-02', '1998-01-30', '1998-01-12', 1, 59.7799988, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10813, 'RICAR', 1, '1998-01-05', '1998-02-02', '1998-01-09', 1, 47.3800011, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10814, 'VICTE', 3, '1998-01-05', '1998-02-02', '1998-01-14', 3, 130.940002, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10815, 'SAVEA', 2, '1998-01-05', '1998-02-02', '1998-01-14', 3, 14.6199999, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10816, 'GREAL', 4, '1998-01-06', '1998-02-03', '1998-02-04', 2, 719.780029, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10817, 'KOENE', 3, '1998-01-06', '1998-01-20', '1998-01-13', 2, 306.070007, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10818, 'MAGAA', 7, '1998-01-07', '1998-02-04', '1998-01-12', 3, 65.4800034, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10819, 'CACTU', 2, '1998-01-07', '1998-02-04', '1998-01-16', 3, 19.7600002, 'Cactus Comidas para llevar', 'Cerrito 333', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10820, 'RATTC', 3, '1998-01-07', '1998-02-04', '1998-01-13', 2, 37.5200005, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10821, 'SPLIR', 1, '1998-01-08', '1998-02-05', '1998-01-15', 1, 36.6800003, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10822, 'TRAIH', 6, '1998-01-08', '1998-02-05', '1998-01-16', 3, 7, 'Trail''s Head Gourmet Provisioners', '722 DaVinci Blvd.', 'Kirkland', 'WA', '98034', 'USA');
INSERT INTO orders VALUES (10823, 'LILAS', 5, '1998-01-09', '1998-02-06', '1998-01-13', 2, 163.970001, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10824, 'FOLKO', 8, '1998-01-09', '1998-02-06', '1998-01-30', 1, 1.23000002, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10825, 'DRACD', 1, '1998-01-09', '1998-02-06', '1998-01-14', 1, 79.25, 'Drachenblut Delikatessen', 'Walserweg 21', 'Aachen', NULL, '52066', 'Germany');
INSERT INTO orders VALUES (10826, 'BLONP', 6, '1998-01-12', '1998-02-09', '1998-02-06', 1, 7.09000015, 'Blondel père et fils', '24, place Kléber', 'Strasbourg', NULL, '67000', 'France');
INSERT INTO orders VALUES (10827, 'BONAP', 1, '1998-01-12', '1998-01-26', '1998-02-06', 2, 63.5400009, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10828, 'RANCH', 9, '1998-01-13', '1998-01-27', '1998-02-04', 1, 90.8499985, 'Rancho grande', 'Av. del Libertador 900', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10829, 'ISLAT', 9, '1998-01-13', '1998-02-10', '1998-01-23', 1, 154.720001, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10830, 'TRADH', 4, '1998-01-13', '1998-02-24', '1998-01-21', 2, 81.8300018, 'Tradiçao Hipermercados', 'Av. Inês de Castro, 414', 'Sao Paulo', 'SP', '05634-030', 'Brazil');
INSERT INTO orders VALUES (10831, 'SANTG', 3, '1998-01-14', '1998-02-11', '1998-01-23', 2, 72.1900024, 'Santé Gourmet', 'Erling Skakkes gate 78', 'Stavern', NULL, '4110', 'Norway');
INSERT INTO orders VALUES (10832, 'LAMAI', 2, '1998-01-14', '1998-02-11', '1998-01-19', 2, 43.2599983, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10833, 'OTTIK', 6, '1998-01-15', '1998-02-12', '1998-01-23', 2, 71.4899979, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (10834, 'TRADH', 1, '1998-01-15', '1998-02-12', '1998-01-19', 3, 29.7800007, 'Tradiçao Hipermercados', 'Av. Inês de Castro, 414', 'Sao Paulo', 'SP', '05634-030', 'Brazil');
INSERT INTO orders VALUES (10835, 'ALFKI', 1, '1998-01-15', '1998-02-12', '1998-01-21', 3, 69.5299988, 'Alfred''s Futterkiste', 'Obere Str. 57', 'Berlin', NULL, '12209', 'Germany');
INSERT INTO orders VALUES (10836, 'ERNSH', 7, '1998-01-16', '1998-02-13', '1998-01-21', 1, 411.880005, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10837, 'BERGS', 9, '1998-01-16', '1998-02-13', '1998-01-23', 3, 13.3199997, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10838, 'LINOD', 3, '1998-01-19', '1998-02-16', '1998-01-23', 3, 59.2799988, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10839, 'TRADH', 3, '1998-01-19', '1998-02-16', '1998-01-22', 3, 35.4300003, 'Tradiçao Hipermercados', 'Av. Inês de Castro, 414', 'Sao Paulo', 'SP', '05634-030', 'Brazil');
INSERT INTO orders VALUES (10840, 'LINOD', 4, '1998-01-19', '1998-03-02', '1998-02-16', 2, 2.71000004, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10841, 'SUPRD', 5, '1998-01-20', '1998-02-17', '1998-01-29', 2, 424.299988, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10842, 'TORTU', 1, '1998-01-20', '1998-02-17', '1998-01-29', 3, 54.4199982, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10843, 'VICTE', 4, '1998-01-21', '1998-02-18', '1998-01-26', 2, 9.26000023, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10844, 'PICCO', 8, '1998-01-21', '1998-02-18', '1998-01-26', 2, 25.2199993, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (10845, 'QUICK', 8, '1998-01-21', '1998-02-04', '1998-01-30', 1, 212.979996, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10846, 'SUPRD', 2, '1998-01-22', '1998-03-05', '1998-01-23', 3, 56.4599991, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10847, 'SAVEA', 4, '1998-01-22', '1998-02-05', '1998-02-10', 3, 487.570007, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10848, 'CONSH', 7, '1998-01-23', '1998-02-20', '1998-01-29', 2, 38.2400017, 'Consolidated Holdings', 'Berkeley Gardens 12  Brewery', 'London', NULL, 'WX1 6LT', 'UK');
INSERT INTO orders VALUES (10849, 'KOENE', 9, '1998-01-23', '1998-02-20', '1998-01-30', 2, 0.560000002, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10850, 'VICTE', 1, '1998-01-23', '1998-03-06', '1998-01-30', 1, 49.1899986, 'Victuailles en stock', '2, rue du Commerce', 'Lyon', NULL, '69004', 'France');
INSERT INTO orders VALUES (10851, 'RICAR', 5, '1998-01-26', '1998-02-23', '1998-02-02', 1, 160.550003, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10852, 'RATTC', 8, '1998-01-26', '1998-02-09', '1998-01-30', 1, 174.050003, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10853, 'BLAUS', 9, '1998-01-27', '1998-02-24', '1998-02-03', 2, 53.8300018, 'Blauer See Delikatessen', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany');
INSERT INTO orders VALUES (10854, 'ERNSH', 3, '1998-01-27', '1998-02-24', '1998-02-05', 2, 100.220001, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10855, 'OLDWO', 3, '1998-01-27', '1998-02-24', '1998-02-04', 1, 170.970001, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10856, 'ANTON', 3, '1998-01-28', '1998-02-25', '1998-02-10', 2, 58.4300003, 'Antonio Moreno Taquería', 'Mataderos  2312', 'México D.F.', NULL, '05023', 'Mexico');
INSERT INTO orders VALUES (10857, 'BERGS', 8, '1998-01-28', '1998-02-25', '1998-02-06', 2, 188.850006, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10858, 'LACOR', 2, '1998-01-29', '1998-02-26', '1998-02-03', 1, 52.5099983, 'La corne d''abondance', '67, avenue de l''Europe', 'Versailles', NULL, '78000', 'France');
INSERT INTO orders VALUES (10859, 'FRANK', 1, '1998-01-29', '1998-02-26', '1998-02-02', 2, 76.0999985, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10860, 'FRANR', 3, '1998-01-29', '1998-02-26', '1998-02-04', 3, 19.2600002, 'France restauration', '54, rue Royale', 'Nantes', NULL, '44000', 'France');
INSERT INTO orders VALUES (10861, 'WHITC', 4, '1998-01-30', '1998-02-27', '1998-02-17', 2, 14.9300003, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10862, 'LEHMS', 8, '1998-01-30', '1998-03-13', '1998-02-02', 2, 53.2299995, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10863, 'HILAA', 4, '1998-02-02', '1998-03-02', '1998-02-17', 2, 30.2600002, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10864, 'AROUT', 4, '1998-02-02', '1998-03-02', '1998-02-09', 2, 3.03999996, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10865, 'QUICK', 2, '1998-02-02', '1998-02-16', '1998-02-12', 1, 348.140015, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10866, 'BERGS', 5, '1998-02-03', '1998-03-03', '1998-02-12', 1, 109.110001, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10867, 'LONEP', 6, '1998-02-03', '1998-03-17', '1998-02-11', 1, 1.92999995, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (10868, 'QUEEN', 7, '1998-02-04', '1998-03-04', '1998-02-23', 2, 191.270004, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10869, 'SEVES', 5, '1998-02-04', '1998-03-04', '1998-02-09', 1, 143.279999, 'Seven Seas Imports', '90 Wadhurst Rd.', 'London', NULL, 'OX15 4NB', 'UK');
INSERT INTO orders VALUES (10870, 'WOLZA', 5, '1998-02-04', '1998-03-04', '1998-02-13', 3, 12.04, 'Wolski Zajazd', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland');
INSERT INTO orders VALUES (10871, 'BONAP', 9, '1998-02-05', '1998-03-05', '1998-02-10', 2, 112.269997, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10872, 'GODOS', 5, '1998-02-05', '1998-03-05', '1998-02-09', 2, 175.320007, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10873, 'WILMK', 4, '1998-02-06', '1998-03-06', '1998-02-09', 1, 0.819999993, 'Wilman Kala', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland');
INSERT INTO orders VALUES (10874, 'GODOS', 5, '1998-02-06', '1998-03-06', '1998-02-11', 2, 19.5799999, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10875, 'BERGS', 4, '1998-02-06', '1998-03-06', '1998-03-03', 2, 32.3699989, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10876, 'BONAP', 7, '1998-02-09', '1998-03-09', '1998-02-12', 3, 60.4199982, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10877, 'RICAR', 1, '1998-02-09', '1998-03-09', '1998-02-19', 1, 38.0600014, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (10878, 'QUICK', 4, '1998-02-10', '1998-03-10', '1998-02-12', 1, 46.6899986, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10879, 'WILMK', 3, '1998-02-10', '1998-03-10', '1998-02-12', 3, 8.5, 'Wilman Kala', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland');
INSERT INTO orders VALUES (10880, 'FOLKO', 7, '1998-02-10', '1998-03-24', '1998-02-18', 1, 88.0100021, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10881, 'CACTU', 4, '1998-02-11', '1998-03-11', '1998-02-18', 1, 2.83999991, 'Cactus Comidas para llevar', 'Cerrito 333', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10882, 'SAVEA', 4, '1998-02-11', '1998-03-11', '1998-02-20', 3, 23.1000004, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10883, 'LONEP', 8, '1998-02-12', '1998-03-12', '1998-02-20', 3, 0.529999971, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (10884, 'LETSS', 4, '1998-02-12', '1998-03-12', '1998-02-13', 2, 90.9700012, 'Let''s Stop N Shop', '87 Polk St. Suite 5', 'San Francisco', 'CA', '94117', 'USA');
INSERT INTO orders VALUES (10885, 'SUPRD', 6, '1998-02-12', '1998-03-12', '1998-02-18', 3, 5.63999987, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10886, 'HANAR', 1, '1998-02-13', '1998-03-13', '1998-03-02', 1, 4.98999977, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10887, 'GALED', 8, '1998-02-13', '1998-03-13', '1998-02-16', 3, 1.25, 'Galería del gastronómo', 'Rambla de Cataluña, 23', 'Barcelona', NULL, '8022', 'Spain');
INSERT INTO orders VALUES (10888, 'GODOS', 1, '1998-02-16', '1998-03-16', '1998-02-23', 2, 51.8699989, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10889, 'RATTC', 9, '1998-02-16', '1998-03-16', '1998-02-23', 3, 280.609985, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10890, 'DUMON', 7, '1998-02-16', '1998-03-16', '1998-02-18', 1, 32.7599983, 'Du monde entier', '67, rue des Cinquante Otages', 'Nantes', NULL, '44000', 'France');
INSERT INTO orders VALUES (10891, 'LEHMS', 7, '1998-02-17', '1998-03-17', '1998-02-19', 2, 20.3700008, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10892, 'MAISD', 4, '1998-02-17', '1998-03-17', '1998-02-19', 2, 120.269997, 'Maison Dewey', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium');
INSERT INTO orders VALUES (10893, 'KOENE', 9, '1998-02-18', '1998-03-18', '1998-02-20', 2, 77.7799988, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (10894, 'SAVEA', 1, '1998-02-18', '1998-03-18', '1998-02-20', 1, 116.129997, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10895, 'ERNSH', 3, '1998-02-18', '1998-03-18', '1998-02-23', 1, 162.75, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10896, 'MAISD', 7, '1998-02-19', '1998-03-19', '1998-02-27', 3, 32.4500008, 'Maison Dewey', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium');
INSERT INTO orders VALUES (10897, 'HUNGO', 3, '1998-02-19', '1998-03-19', '1998-02-25', 2, 603.539978, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10898, 'OCEAN', 4, '1998-02-20', '1998-03-20', '1998-03-06', 2, 1.26999998, 'Océano Atlántico Ltda.', 'Ing. Gustavo Moncada 8585 Piso 20-A', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10899, 'LILAS', 5, '1998-02-20', '1998-03-20', '1998-02-26', 3, 1.21000004, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10900, 'WELLI', 1, '1998-02-20', '1998-03-20', '1998-03-04', 2, 1.65999997, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10901, 'HILAA', 4, '1998-02-23', '1998-03-23', '1998-02-26', 1, 62.0900002, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10902, 'FOLKO', 1, '1998-02-23', '1998-03-23', '1998-03-03', 1, 44.1500015, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10903, 'HANAR', 3, '1998-02-24', '1998-03-24', '1998-03-04', 3, 36.7099991, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10904, 'WHITC', 3, '1998-02-24', '1998-03-24', '1998-02-27', 3, 162.949997, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (10905, 'WELLI', 9, '1998-02-24', '1998-03-24', '1998-03-06', 2, 13.7200003, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10906, 'WOLZA', 4, '1998-02-25', '1998-03-11', '1998-03-03', 3, 26.2900009, 'Wolski Zajazd', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland');
INSERT INTO orders VALUES (10907, 'SPECD', 6, '1998-02-25', '1998-03-25', '1998-02-27', 3, 9.18999958, 'Spécialités du monde', '25, rue Lauriston', 'Paris', NULL, '75016', 'France');
INSERT INTO orders VALUES (10908, 'REGGC', 4, '1998-02-26', '1998-03-26', '1998-03-06', 2, 32.9599991, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10909, 'SANTG', 1, '1998-02-26', '1998-03-26', '1998-03-10', 2, 53.0499992, 'Santé Gourmet', 'Erling Skakkes gate 78', 'Stavern', NULL, '4110', 'Norway');
INSERT INTO orders VALUES (10910, 'WILMK', 1, '1998-02-26', '1998-03-26', '1998-03-04', 3, 38.1100006, 'Wilman Kala', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland');
INSERT INTO orders VALUES (10911, 'GODOS', 3, '1998-02-26', '1998-03-26', '1998-03-05', 1, 38.1899986, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10912, 'HUNGO', 2, '1998-02-26', '1998-03-26', '1998-03-18', 2, 580.909973, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10913, 'QUEEN', 4, '1998-02-26', '1998-03-26', '1998-03-04', 1, 33.0499992, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10914, 'QUEEN', 6, '1998-02-27', '1998-03-27', '1998-03-02', 1, 21.1900005, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10915, 'TORTU', 2, '1998-02-27', '1998-03-27', '1998-03-02', 2, 3.50999999, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10916, 'RANCH', 1, '1998-02-27', '1998-03-27', '1998-03-09', 2, 63.7700005, 'Rancho grande', 'Av. del Libertador 900', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10917, 'ROMEY', 4, '1998-03-02', '1998-03-30', '1998-03-11', 2, 8.28999996, 'Romero y tomillo', 'Gran Vía, 1', 'Madrid', NULL, '28001', 'Spain');
INSERT INTO orders VALUES (10918, 'BOTTM', 3, '1998-03-02', '1998-03-30', '1998-03-11', 3, 48.8300018, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10919, 'LINOD', 2, '1998-03-02', '1998-03-30', '1998-03-04', 2, 19.7999992, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10920, 'AROUT', 4, '1998-03-03', '1998-03-31', '1998-03-09', 2, 29.6100006, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10921, 'VAFFE', 1, '1998-03-03', '1998-04-14', '1998-03-09', 1, 176.479996, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10922, 'HANAR', 5, '1998-03-03', '1998-03-31', '1998-03-05', 3, 62.7400017, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10923, 'LAMAI', 7, '1998-03-03', '1998-04-14', '1998-03-13', 3, 68.2600021, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (10924, 'BERGS', 3, '1998-03-04', '1998-04-01', '1998-04-08', 2, 151.520004, 'Berglunds snabbköp', 'Berguvsvägen  8', 'Luleå', NULL, 'S-958 22', 'Sweden');
INSERT INTO orders VALUES (10925, 'HANAR', 3, '1998-03-04', '1998-04-01', '1998-03-13', 1, 2.26999998, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10926, 'ANATR', 4, '1998-03-04', '1998-04-01', '1998-03-11', 3, 39.9199982, 'Ana Trujillo Emparedados y helados', 'Avda. de la Constitución 2222', 'México D.F.', NULL, '05021', 'Mexico');
INSERT INTO orders VALUES (10927, 'LACOR', 4, '1998-03-05', '1998-04-02', '1998-04-08', 1, 19.7900009, 'La corne d''abondance', '67, avenue de l''Europe', 'Versailles', NULL, '78000', 'France');
INSERT INTO orders VALUES (10928, 'GALED', 1, '1998-03-05', '1998-04-02', '1998-03-18', 1, 1.36000001, 'Galería del gastronómo', 'Rambla de Cataluña, 23', 'Barcelona', NULL, '8022', 'Spain');
INSERT INTO orders VALUES (10929, 'FRANK', 6, '1998-03-05', '1998-04-02', '1998-03-12', 1, 33.9300003, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (10930, 'SUPRD', 4, '1998-03-06', '1998-04-17', '1998-03-18', 3, 15.5500002, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (10931, 'RICSU', 4, '1998-03-06', '1998-03-20', '1998-03-19', 2, 13.6000004, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10932, 'BONAP', 8, '1998-03-06', '1998-04-03', '1998-03-24', 1, 134.639999, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10933, 'ISLAT', 6, '1998-03-06', '1998-04-03', '1998-03-16', 3, 54.1500015, 'Island Trading', 'Garden House Crowther Way', 'Cowes', 'Isle of Wight', 'PO31 7PJ', 'UK');
INSERT INTO orders VALUES (10934, 'LEHMS', 3, '1998-03-09', '1998-04-06', '1998-03-12', 3, 32.0099983, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (10935, 'WELLI', 4, '1998-03-09', '1998-04-06', '1998-03-18', 3, 47.5900002, 'Wellington Importadora', 'Rua do Mercado, 12', 'Resende', 'SP', '08737-363', 'Brazil');
INSERT INTO orders VALUES (10936, 'GREAL', 3, '1998-03-09', '1998-04-06', '1998-03-18', 2, 33.6800003, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (10937, 'CACTU', 7, '1998-03-10', '1998-03-24', '1998-03-13', 3, 31.5100002, 'Cactus Comidas para llevar', 'Cerrito 333', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10938, 'QUICK', 3, '1998-03-10', '1998-04-07', '1998-03-16', 2, 31.8899994, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10939, 'MAGAA', 2, '1998-03-10', '1998-04-07', '1998-03-13', 2, 76.3300018, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10940, 'BONAP', 8, '1998-03-11', '1998-04-08', '1998-03-23', 3, 19.7700005, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (10941, 'SAVEA', 7, '1998-03-11', '1998-04-08', '1998-03-20', 2, 400.809998, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10942, 'REGGC', 9, '1998-03-11', '1998-04-08', '1998-03-18', 3, 17.9500008, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (10943, 'BSBEV', 4, '1998-03-11', '1998-04-08', '1998-03-19', 2, 2.17000008, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10944, 'BOTTM', 6, '1998-03-12', '1998-03-26', '1998-03-13', 3, 52.9199982, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10945, 'MORGK', 4, '1998-03-12', '1998-04-09', '1998-03-18', 1, 10.2200003, 'Morgenstern Gesundkost', 'Heerstr. 22', 'Leipzig', NULL, '04179', 'Germany');
INSERT INTO orders VALUES (10946, 'VAFFE', 1, '1998-03-12', '1998-04-09', '1998-03-19', 2, 27.2000008, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10947, 'BSBEV', 3, '1998-03-13', '1998-04-10', '1998-03-16', 2, 3.25999999, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (10948, 'GODOS', 3, '1998-03-13', '1998-04-10', '1998-03-19', 3, 23.3899994, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (10949, 'BOTTM', 2, '1998-03-13', '1998-04-10', '1998-03-17', 3, 74.4400024, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10950, 'MAGAA', 1, '1998-03-16', '1998-04-13', '1998-03-23', 2, 2.5, 'Magazzini Alimentari Riuniti', 'Via Ludovico il Moro 22', 'Bergamo', NULL, '24100', 'Italy');
INSERT INTO orders VALUES (10951, 'RICSU', 9, '1998-03-16', '1998-04-27', '1998-04-07', 2, 30.8500004, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (10952, 'ALFKI', 1, '1998-03-16', '1998-04-27', '1998-03-24', 1, 40.4199982, 'Alfred''s Futterkiste', 'Obere Str. 57', 'Berlin', NULL, '12209', 'Germany');
INSERT INTO orders VALUES (10953, 'AROUT', 9, '1998-03-16', '1998-03-30', '1998-03-25', 2, 23.7199993, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (10954, 'LINOD', 5, '1998-03-17', '1998-04-28', '1998-03-20', 1, 27.9099998, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (10955, 'FOLKO', 8, '1998-03-17', '1998-04-14', '1998-03-20', 2, 3.25999999, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10956, 'BLAUS', 6, '1998-03-17', '1998-04-28', '1998-03-20', 2, 44.6500015, 'Blauer See Delikatessen', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany');
INSERT INTO orders VALUES (10957, 'HILAA', 8, '1998-03-18', '1998-04-15', '1998-03-27', 3, 105.360001, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10958, 'OCEAN', 7, '1998-03-18', '1998-04-15', '1998-03-27', 2, 49.5600014, 'Océano Atlántico Ltda.', 'Ing. Gustavo Moncada 8585 Piso 20-A', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10959, 'GOURL', 6, '1998-03-18', '1998-04-29', '1998-03-23', 2, 4.98000002, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (10960, 'HILAA', 3, '1998-03-19', '1998-04-02', '1998-04-08', 1, 2.07999992, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10961, 'QUEEN', 8, '1998-03-19', '1998-04-16', '1998-03-30', 1, 104.470001, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (10962, 'QUICK', 8, '1998-03-19', '1998-04-16', '1998-03-23', 2, 275.790009, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10963, 'FURIB', 9, '1998-03-19', '1998-04-16', '1998-03-26', 3, 2.70000005, 'Furia Bacalhau e Frutos do Mar', 'Jardim das rosas n. 32', 'Lisboa', NULL, '1675', 'Portugal');
INSERT INTO orders VALUES (10964, 'SPECD', 3, '1998-03-20', '1998-04-17', '1998-03-24', 2, 87.3799973, 'Spécialités du monde', '25, rue Lauriston', 'Paris', NULL, '75016', 'France');
INSERT INTO orders VALUES (10965, 'OLDWO', 6, '1998-03-20', '1998-04-17', '1998-03-30', 3, 144.380005, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (10966, 'CHOPS', 4, '1998-03-20', '1998-04-17', '1998-04-08', 1, 27.1900005, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (10967, 'TOMSP', 2, '1998-03-23', '1998-04-20', '1998-04-02', 2, 62.2200012, 'Toms Spezialitäten', 'Luisenstr. 48', 'Münster', NULL, '44087', 'Germany');
INSERT INTO orders VALUES (10968, 'ERNSH', 1, '1998-03-23', '1998-04-20', '1998-04-01', 3, 74.5999985, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10969, 'COMMI', 1, '1998-03-23', '1998-04-20', '1998-03-30', 2, 0.209999993, 'Comércio Mineiro', 'Av. dos Lusíadas, 23', 'Sao Paulo', 'SP', '05432-043', 'Brazil');
INSERT INTO orders VALUES (10970, 'BOLID', 9, '1998-03-24', '1998-04-07', '1998-04-24', 1, 16.1599998, 'Bólido Comidas preparadas', 'C/ Araquil, 67', 'Madrid', NULL, '28023', 'Spain');
INSERT INTO orders VALUES (10971, 'FRANR', 2, '1998-03-24', '1998-04-21', '1998-04-02', 2, 121.82, 'France restauration', '54, rue Royale', 'Nantes', NULL, '44000', 'France');
INSERT INTO orders VALUES (10972, 'LACOR', 4, '1998-03-24', '1998-04-21', '1998-03-26', 2, 0.0199999996, 'La corne d''abondance', '67, avenue de l''Europe', 'Versailles', NULL, '78000', 'France');
INSERT INTO orders VALUES (10973, 'LACOR', 6, '1998-03-24', '1998-04-21', '1998-03-27', 2, 15.1700001, 'La corne d''abondance', '67, avenue de l''Europe', 'Versailles', NULL, '78000', 'France');
INSERT INTO orders VALUES (10974, 'SPLIR', 3, '1998-03-25', '1998-04-08', '1998-04-03', 3, 12.96, 'Split Rail Beer & Ale', 'P.O. Box 555', 'Lander', 'WY', '82520', 'USA');
INSERT INTO orders VALUES (10975, 'BOTTM', 1, '1998-03-25', '1998-04-22', '1998-03-27', 3, 32.2700005, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10976, 'HILAA', 1, '1998-03-25', '1998-05-06', '1998-04-03', 1, 37.9700012, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (10977, 'FOLKO', 8, '1998-03-26', '1998-04-23', '1998-04-10', 3, 208.5, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10978, 'MAISD', 9, '1998-03-26', '1998-04-23', '1998-04-23', 2, 32.8199997, 'Maison Dewey', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium');
INSERT INTO orders VALUES (10979, 'ERNSH', 8, '1998-03-26', '1998-04-23', '1998-03-31', 2, 353.070007, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10980, 'FOLKO', 4, '1998-03-27', '1998-05-08', '1998-04-17', 1, 1.25999999, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10981, 'HANAR', 1, '1998-03-27', '1998-04-24', '1998-04-02', 2, 193.369995, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (10982, 'BOTTM', 2, '1998-03-27', '1998-04-24', '1998-04-08', 1, 14.0100002, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (10983, 'SAVEA', 2, '1998-03-27', '1998-04-24', '1998-04-06', 2, 657.539978, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10984, 'SAVEA', 1, '1998-03-30', '1998-04-27', '1998-04-03', 3, 211.220001, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (10985, 'HUNGO', 2, '1998-03-30', '1998-04-27', '1998-04-02', 1, 91.5100021, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (10986, 'OCEAN', 8, '1998-03-30', '1998-04-27', '1998-04-21', 2, 217.860001, 'Océano Atlántico Ltda.', 'Ing. Gustavo Moncada 8585 Piso 20-A', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (10987, 'EASTC', 8, '1998-03-31', '1998-04-28', '1998-04-06', 1, 185.479996, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (10988, 'RATTC', 3, '1998-03-31', '1998-04-28', '1998-04-10', 2, 61.1399994, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (10989, 'QUEDE', 2, '1998-03-31', '1998-04-28', '1998-04-02', 1, 34.7599983, 'Que Delícia', 'Rua da Panificadora, 12', 'Rio de Janeiro', 'RJ', '02389-673', 'Brazil');
INSERT INTO orders VALUES (10990, 'ERNSH', 2, '1998-04-01', '1998-05-13', '1998-04-07', 3, 117.610001, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (10991, 'QUICK', 1, '1998-04-01', '1998-04-29', '1998-04-07', 1, 38.5099983, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10992, 'THEBI', 1, '1998-04-01', '1998-04-29', '1998-04-03', 3, 4.26999998, 'The Big Cheese', '89 Jefferson Way Suite 2', 'Portland', 'OR', '97201', 'USA');
INSERT INTO orders VALUES (10993, 'FOLKO', 7, '1998-04-01', '1998-04-29', '1998-04-10', 3, 8.81000042, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (10994, 'VAFFE', 2, '1998-04-02', '1998-04-16', '1998-04-09', 3, 65.5299988, 'Vaffeljernet', 'Smagsloget 45', 'Århus', NULL, '8200', 'Denmark');
INSERT INTO orders VALUES (10995, 'PERIC', 1, '1998-04-02', '1998-04-30', '1998-04-06', 3, 46, 'Pericles Comidas clásicas', 'Calle Dr. Jorge Cash 321', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (10996, 'QUICK', 4, '1998-04-02', '1998-04-30', '1998-04-10', 2, 1.12, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (10997, 'LILAS', 8, '1998-04-03', '1998-05-15', '1998-04-13', 2, 73.9100037, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (10998, 'WOLZA', 8, '1998-04-03', '1998-04-17', '1998-04-17', 2, 20.3099995, 'Wolski Zajazd', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland');
INSERT INTO orders VALUES (10999, 'OTTIK', 6, '1998-04-03', '1998-05-01', '1998-04-10', 2, 96.3499985, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (11000, 'RATTC', 2, '1998-04-06', '1998-05-04', '1998-04-14', 3, 55.1199989, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');
INSERT INTO orders VALUES (11001, 'FOLKO', 2, '1998-04-06', '1998-05-04', '1998-04-14', 2, 197.300003, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (11002, 'SAVEA', 4, '1998-04-06', '1998-05-04', '1998-04-16', 1, 141.160004, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (11003, 'THECR', 3, '1998-04-06', '1998-05-04', '1998-04-08', 3, 14.9099998, 'The Cracker Box', '55 Grizzly Peak Rd.', 'Butte', 'MT', '59801', 'USA');
INSERT INTO orders VALUES (11004, 'MAISD', 3, '1998-04-07', '1998-05-05', '1998-04-20', 1, 44.8400002, 'Maison Dewey', 'Rue Joseph-Bens 532', 'Bruxelles', NULL, 'B-1180', 'Belgium');
INSERT INTO orders VALUES (11005, 'WILMK', 2, '1998-04-07', '1998-05-05', '1998-04-10', 1, 0.75, 'Wilman Kala', 'Keskuskatu 45', 'Helsinki', NULL, '21240', 'Finland');
INSERT INTO orders VALUES (11006, 'GREAL', 3, '1998-04-07', '1998-05-05', '1998-04-15', 2, 25.1900005, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (11007, 'PRINI', 8, '1998-04-08', '1998-05-06', '1998-04-13', 2, 202.240005, 'Princesa Isabel Vinhos', 'Estrada da saúde n. 58', 'Lisboa', NULL, '1756', 'Portugal');
INSERT INTO orders VALUES (11008, 'ERNSH', 7, '1998-04-08', '1998-05-06', NULL, 3, 79.4599991, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (11009, 'GODOS', 2, '1998-04-08', '1998-05-06', '1998-04-10', 1, 59.1100006, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (11010, 'REGGC', 2, '1998-04-09', '1998-05-07', '1998-04-21', 2, 28.7099991, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (11011, 'ALFKI', 3, '1998-04-09', '1998-05-07', '1998-04-13', 1, 1.21000004, 'Alfred''s Futterkiste', 'Obere Str. 57', 'Berlin', NULL, '12209', 'Germany');
INSERT INTO orders VALUES (11012, 'FRANK', 1, '1998-04-09', '1998-04-23', '1998-04-17', 3, 242.949997, 'Frankenversand', 'Berliner Platz 43', 'München', NULL, '80805', 'Germany');
INSERT INTO orders VALUES (11013, 'ROMEY', 2, '1998-04-09', '1998-05-07', '1998-04-10', 1, 32.9900017, 'Romero y tomillo', 'Gran Vía, 1', 'Madrid', NULL, '28001', 'Spain');
INSERT INTO orders VALUES (11014, 'LINOD', 2, '1998-04-10', '1998-05-08', '1998-04-15', 3, 23.6000004, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (11015, 'SANTG', 2, '1998-04-10', '1998-04-24', '1998-04-20', 2, 4.61999989, 'Santé Gourmet', 'Erling Skakkes gate 78', 'Stavern', NULL, '4110', 'Norway');
INSERT INTO orders VALUES (11016, 'AROUT', 9, '1998-04-10', '1998-05-08', '1998-04-13', 2, 33.7999992, 'Around the Horn', 'Brook Farm Stratford St. Mary', 'Colchester', 'Essex', 'CO7 6JX', 'UK');
INSERT INTO orders VALUES (11017, 'ERNSH', 9, '1998-04-13', '1998-05-11', '1998-04-20', 2, 754.26001, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (11018, 'LONEP', 4, '1998-04-13', '1998-05-11', '1998-04-16', 2, 11.6499996, 'Lonesome Pine Restaurant', '89 Chiaroscuro Rd.', 'Portland', 'OR', '97219', 'USA');
INSERT INTO orders VALUES (11019, 'RANCH', 6, '1998-04-13', '1998-05-11', NULL, 3, 3.17000008, 'Rancho grande', 'Av. del Libertador 900', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (11020, 'OTTIK', 2, '1998-04-14', '1998-05-12', '1998-04-16', 2, 43.2999992, 'Ottilies Käseladen', 'Mehrheimerstr. 369', 'Köln', NULL, '50739', 'Germany');
INSERT INTO orders VALUES (11021, 'QUICK', 3, '1998-04-14', '1998-05-12', '1998-04-21', 1, 297.179993, 'QUICK-Stop', 'Taucherstraße 10', 'Cunewalde', NULL, '01307', 'Germany');
INSERT INTO orders VALUES (11022, 'HANAR', 9, '1998-04-14', '1998-05-12', '1998-05-04', 2, 6.26999998, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (11023, 'BSBEV', 1, '1998-04-14', '1998-04-28', '1998-04-24', 2, 123.830002, 'B''s Beverages', 'Fauntleroy Circus', 'London', NULL, 'EC2 5NT', 'UK');
INSERT INTO orders VALUES (11024, 'EASTC', 4, '1998-04-15', '1998-05-13', '1998-04-20', 1, 74.3600006, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (11025, 'WARTH', 6, '1998-04-15', '1998-05-13', '1998-04-24', 3, 29.1700001, 'Wartian Herkku', 'Torikatu 38', 'Oulu', NULL, '90110', 'Finland');
INSERT INTO orders VALUES (11026, 'FRANS', 4, '1998-04-15', '1998-05-13', '1998-04-28', 1, 47.0900002, 'Franchi S.p.A.', 'Via Monte Bianco 34', 'Torino', NULL, '10100', 'Italy');
INSERT INTO orders VALUES (11027, 'BOTTM', 1, '1998-04-16', '1998-05-14', '1998-04-20', 1, 52.5200005, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (11028, 'KOENE', 2, '1998-04-16', '1998-05-14', '1998-04-22', 1, 29.5900002, 'Königlich Essen', 'Maubelstr. 90', 'Brandenburg', NULL, '14776', 'Germany');
INSERT INTO orders VALUES (11029, 'CHOPS', 4, '1998-04-16', '1998-05-14', '1998-04-27', 1, 47.8400002, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (11030, 'SAVEA', 7, '1998-04-17', '1998-05-15', '1998-04-27', 2, 830.75, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (11031, 'SAVEA', 6, '1998-04-17', '1998-05-15', '1998-04-24', 2, 227.220001, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (11032, 'WHITC', 2, '1998-04-17', '1998-05-15', '1998-04-23', 3, 606.190002, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (11033, 'RICSU', 7, '1998-04-17', '1998-05-15', '1998-04-23', 3, 84.7399979, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (11034, 'OLDWO', 8, '1998-04-20', '1998-06-01', '1998-04-27', 1, 40.3199997, 'Old World Delicatessen', '2743 Bering St.', 'Anchorage', 'AK', '99508', 'USA');
INSERT INTO orders VALUES (11035, 'SUPRD', 2, '1998-04-20', '1998-05-18', '1998-04-24', 2, 0.170000002, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (11036, 'DRACD', 8, '1998-04-20', '1998-05-18', '1998-04-22', 3, 149.470001, 'Drachenblut Delikatessen', 'Walserweg 21', 'Aachen', NULL, '52066', 'Germany');
INSERT INTO orders VALUES (11037, 'GODOS', 7, '1998-04-21', '1998-05-19', '1998-04-27', 1, 3.20000005, 'Godos Cocina Típica', 'C/ Romero, 33', 'Sevilla', NULL, '41101', 'Spain');
INSERT INTO orders VALUES (11038, 'SUPRD', 1, '1998-04-21', '1998-05-19', '1998-04-30', 2, 29.5900002, 'Suprêmes délices', 'Boulevard Tirou, 255', 'Charleroi', NULL, 'B-6000', 'Belgium');
INSERT INTO orders VALUES (11039, 'LINOD', 1, '1998-04-21', '1998-05-19', NULL, 2, 65, 'LINO-Delicateses', 'Ave. 5 de Mayo Porlamar', 'I. de Margarita', 'Nueva Esparta', '4980', 'Venezuela');
INSERT INTO orders VALUES (11040, 'GREAL', 4, '1998-04-22', '1998-05-20', NULL, 3, 18.8400002, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (11041, 'CHOPS', 3, '1998-04-22', '1998-05-20', '1998-04-28', 2, 48.2200012, 'Chop-suey Chinese', 'Hauptstr. 31', 'Bern', NULL, '3012', 'Switzerland');
INSERT INTO orders VALUES (11042, 'COMMI', 2, '1998-04-22', '1998-05-06', '1998-05-01', 1, 29.9899998, 'Comércio Mineiro', 'Av. dos Lusíadas, 23', 'Sao Paulo', 'SP', '05432-043', 'Brazil');
INSERT INTO orders VALUES (11043, 'SPECD', 5, '1998-04-22', '1998-05-20', '1998-04-29', 2, 8.80000019, 'Spécialités du monde', '25, rue Lauriston', 'Paris', NULL, '75016', 'France');
INSERT INTO orders VALUES (11044, 'WOLZA', 4, '1998-04-23', '1998-05-21', '1998-05-01', 1, 8.72000027, 'Wolski Zajazd', 'ul. Filtrowa 68', 'Warszawa', NULL, '01-012', 'Poland');
INSERT INTO orders VALUES (11045, 'BOTTM', 6, '1998-04-23', '1998-05-21', NULL, 2, 70.5800018, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (11046, 'WANDK', 8, '1998-04-23', '1998-05-21', '1998-04-24', 2, 71.6399994, 'Die Wandernde Kuh', 'Adenauerallee 900', 'Stuttgart', NULL, '70563', 'Germany');
INSERT INTO orders VALUES (11047, 'EASTC', 7, '1998-04-24', '1998-05-22', '1998-05-01', 3, 46.6199989, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (11048, 'BOTTM', 7, '1998-04-24', '1998-05-22', '1998-04-30', 3, 24.1200008, 'Bottom-Dollar Markets', '23 Tsawassen Blvd.', 'Tsawassen', 'BC', 'T2F 8M4', 'Canada');
INSERT INTO orders VALUES (11049, 'GOURL', 3, '1998-04-24', '1998-05-22', '1998-05-04', 1, 8.34000015, 'Gourmet Lanchonetes', 'Av. Brasil, 442', 'Campinas', 'SP', '04876-786', 'Brazil');
INSERT INTO orders VALUES (11050, 'FOLKO', 8, '1998-04-27', '1998-05-25', '1998-05-05', 2, 59.4099998, 'Folk och fä HB', 'Åkergatan 24', 'Bräcke', NULL, 'S-844 67', 'Sweden');
INSERT INTO orders VALUES (11051, 'LAMAI', 7, '1998-04-27', '1998-05-25', NULL, 3, 2.78999996, 'La maison d''Asie', '1 rue Alsace-Lorraine', 'Toulouse', NULL, '31000', 'France');
INSERT INTO orders VALUES (11052, 'HANAR', 3, '1998-04-27', '1998-05-25', '1998-05-01', 1, 67.2600021, 'Hanari Carnes', 'Rua do Paço, 67', 'Rio de Janeiro', 'RJ', '05454-876', 'Brazil');
INSERT INTO orders VALUES (11053, 'PICCO', 2, '1998-04-27', '1998-05-25', '1998-04-29', 2, 53.0499992, 'Piccolo und mehr', 'Geislweg 14', 'Salzburg', NULL, '5020', 'Austria');
INSERT INTO orders VALUES (11054, 'CACTU', 8, '1998-04-28', '1998-05-26', NULL, 1, 0.330000013, 'Cactus Comidas para llevar', 'Cerrito 333', 'Buenos Aires', NULL, '1010', 'Argentina');
INSERT INTO orders VALUES (11055, 'HILAA', 7, '1998-04-28', '1998-05-26', '1998-05-05', 2, 120.919998, 'HILARION-Abastos', 'Carrera 22 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '5022', 'Venezuela');
INSERT INTO orders VALUES (11056, 'EASTC', 8, '1998-04-28', '1998-05-12', '1998-05-01', 2, 278.959991, 'Eastern Connection', '35 King George', 'London', NULL, 'WX3 6FW', 'UK');
INSERT INTO orders VALUES (11057, 'NORTS', 3, '1998-04-29', '1998-05-27', '1998-05-01', 3, 4.13000011, 'North/South', 'South House 300 Queensbridge', 'London', NULL, 'SW7 1RZ', 'UK');
INSERT INTO orders VALUES (11058, 'BLAUS', 9, '1998-04-29', '1998-05-27', NULL, 3, 31.1399994, 'Blauer See Delikatessen', 'Forsterstr. 57', 'Mannheim', NULL, '68306', 'Germany');
INSERT INTO orders VALUES (11059, 'RICAR', 2, '1998-04-29', '1998-06-10', NULL, 2, 85.8000031, 'Ricardo Adocicados', 'Av. Copacabana, 267', 'Rio de Janeiro', 'RJ', '02389-890', 'Brazil');
INSERT INTO orders VALUES (11060, 'FRANS', 2, '1998-04-30', '1998-05-28', '1998-05-04', 2, 10.9799995, 'Franchi S.p.A.', 'Via Monte Bianco 34', 'Torino', NULL, '10100', 'Italy');
INSERT INTO orders VALUES (11061, 'GREAL', 4, '1998-04-30', '1998-06-11', NULL, 3, 14.0100002, 'Great Lakes Food Market', '2732 Baker Blvd.', 'Eugene', 'OR', '97403', 'USA');
INSERT INTO orders VALUES (11062, 'REGGC', 4, '1998-04-30', '1998-05-28', NULL, 2, 29.9300003, 'Reggiani Caseifici', 'Strada Provinciale 124', 'Reggio Emilia', NULL, '42100', 'Italy');
INSERT INTO orders VALUES (11063, 'HUNGO', 3, '1998-04-30', '1998-05-28', '1998-05-06', 2, 81.7300034, 'Hungry Owl All-Night Grocers', '8 Johnstown Road', 'Cork', 'Co. Cork', NULL, 'Ireland');
INSERT INTO orders VALUES (11064, 'SAVEA', 1, '1998-05-01', '1998-05-29', '1998-05-04', 1, 30.0900002, 'Save-a-lot Markets', '187 Suffolk Ln.', 'Boise', 'ID', '83720', 'USA');
INSERT INTO orders VALUES (11065, 'LILAS', 8, '1998-05-01', '1998-05-29', NULL, 1, 12.9099998, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (11066, 'WHITC', 7, '1998-05-01', '1998-05-29', '1998-05-04', 2, 44.7200012, 'White Clover Markets', '1029 - 12th Ave. S.', 'Seattle', 'WA', '98124', 'USA');
INSERT INTO orders VALUES (11067, 'DRACD', 1, '1998-05-04', '1998-05-18', '1998-05-06', 2, 7.98000002, 'Drachenblut Delikatessen', 'Walserweg 21', 'Aachen', NULL, '52066', 'Germany');
INSERT INTO orders VALUES (11068, 'QUEEN', 8, '1998-05-04', '1998-06-01', NULL, 2, 81.75, 'Queen Cozinha', 'Alameda dos Canàrios, 891', 'Sao Paulo', 'SP', '05487-020', 'Brazil');
INSERT INTO orders VALUES (11069, 'TORTU', 1, '1998-05-04', '1998-06-01', '1998-05-06', 2, 15.6700001, 'Tortuga Restaurante', 'Avda. Azteca 123', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (11070, 'LEHMS', 2, '1998-05-05', '1998-06-02', NULL, 1, 136, 'Lehmanns Marktstand', 'Magazinweg 7', 'Frankfurt a.M.', NULL, '60528', 'Germany');
INSERT INTO orders VALUES (11071, 'LILAS', 1, '1998-05-05', '1998-06-02', NULL, 1, 0.930000007, 'LILA-Supermercado', 'Carrera 52 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '3508', 'Venezuela');
INSERT INTO orders VALUES (11072, 'ERNSH', 4, '1998-05-05', '1998-06-02', NULL, 2, 258.640015, 'Ernst Handel', 'Kirchgasse 6', 'Graz', NULL, '8010', 'Austria');
INSERT INTO orders VALUES (11073, 'PERIC', 2, '1998-05-05', '1998-06-02', NULL, 2, 24.9500008, 'Pericles Comidas clásicas', 'Calle Dr. Jorge Cash 321', 'México D.F.', NULL, '05033', 'Mexico');
INSERT INTO orders VALUES (11074, 'SIMOB', 7, '1998-05-06', '1998-06-03', NULL, 2, 18.4400005, 'Simons bistro', 'Vinbæltet 34', 'Kobenhavn', NULL, '1734', 'Denmark');
INSERT INTO orders VALUES (11075, 'RICSU', 8, '1998-05-06', '1998-06-03', NULL, 2, 6.19000006, 'Richter Supermarkt', 'Starenweg 5', 'Genève', NULL, '1204', 'Switzerland');
INSERT INTO orders VALUES (11076, 'BONAP', 4, '1998-05-06', '1998-06-03', NULL, 2, 38.2799988, 'Bon app''', '12, rue des Bouchers', 'Marseille', NULL, '13008', 'France');
INSERT INTO orders VALUES (11077, 'RATTC', 1, '1998-05-06', '1998-06-03', NULL, 2, 8.52999973, 'Rattlesnake Canyon Grocery', '2817 Milton Dr.', 'Albuquerque', 'NM', '87110', 'USA');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO products VALUES (1, 'Chai', 8, 1, '10 boxes x 30 bags', 18, 39, 0, 10, 1);
INSERT INTO products VALUES (2, 'Chang', 1, 1, '24 - 12 oz bottles', 19, 17, 40, 25, 1);
INSERT INTO products VALUES (3, 'Aniseed Syrup', 1, 2, '12 - 550 ml bottles', 10, 13, 70, 25, 0);
INSERT INTO products VALUES (4, 'Chef Anton''s Cajun Seasoning', 2, 2, '48 - 6 oz jars', 22, 53, 0, 0, 0);
INSERT INTO products VALUES (5, 'Chef Anton''s Gumbo Mix', 2, 2, '36 boxes', 21.3500004, 0, 0, 0, 1);
INSERT INTO products VALUES (6, 'Grandma''s Boysenberry Spread', 3, 2, '12 - 8 oz jars', 25, 120, 0, 25, 0);
INSERT INTO products VALUES (7, 'Uncle Bob''s Organic Dried Pears', 3, 7, '12 - 1 lb pkgs.', 30, 15, 0, 10, 0);
INSERT INTO products VALUES (8, 'Northwoods Cranberry Sauce', 3, 2, '12 - 12 oz jars', 40, 6, 0, 0, 0);
INSERT INTO products VALUES (9, 'Mishi Kobe Niku', 4, 6, '18 - 500 g pkgs.', 97, 29, 0, 0, 1);
INSERT INTO products VALUES (10, 'Ikura', 4, 8, '12 - 200 ml jars', 31, 31, 0, 0, 0);
INSERT INTO products VALUES (11, 'Queso Cabrales', 5, 4, '1 kg pkg.', 21, 22, 30, 30, 0);
INSERT INTO products VALUES (12, 'Queso Manchego La Pastora', 5, 4, '10 - 500 g pkgs.', 38, 86, 0, 0, 0);
INSERT INTO products VALUES (13, 'Konbu', 6, 8, '2 kg box', 6, 24, 0, 5, 0);
INSERT INTO products VALUES (14, 'Tofu', 6, 7, '40 - 100 g pkgs.', 23.25, 35, 0, 0, 0);
INSERT INTO products VALUES (15, 'Genen Shouyu', 6, 2, '24 - 250 ml bottles', 13, 39, 0, 5, 0);
INSERT INTO products VALUES (16, 'Pavlova', 7, 3, '32 - 500 g boxes', 17.4500008, 29, 0, 10, 0);
INSERT INTO products VALUES (17, 'Alice Mutton', 7, 6, '20 - 1 kg tins', 39, 0, 0, 0, 1);
INSERT INTO products VALUES (18, 'Carnarvon Tigers', 7, 8, '16 kg pkg.', 62.5, 42, 0, 0, 0);
INSERT INTO products VALUES (19, 'Teatime Chocolate Biscuits', 8, 3, '10 boxes x 12 pieces', 9.19999981, 25, 0, 5, 0);
INSERT INTO products VALUES (20, 'Sir Rodney''s Marmalade', 8, 3, '30 gift boxes', 81, 40, 0, 0, 0);
INSERT INTO products VALUES (21, 'Sir Rodney''s Scones', 8, 3, '24 pkgs. x 4 pieces', 10, 3, 40, 5, 0);
INSERT INTO products VALUES (22, 'Gustaf''s Knäckebröd', 9, 5, '24 - 500 g pkgs.', 21, 104, 0, 25, 0);
INSERT INTO products VALUES (23, 'Tunnbröd', 9, 5, '12 - 250 g pkgs.', 9, 61, 0, 25, 0);
INSERT INTO products VALUES (24, 'Guaraná Fantástica', 10, 1, '12 - 355 ml cans', 4.5, 20, 0, 0, 1);
INSERT INTO products VALUES (25, 'NuNuCa Nuß-Nougat-Creme', 11, 3, '20 - 450 g glasses', 14, 76, 0, 30, 0);
INSERT INTO products VALUES (26, 'Gumbär Gummibärchen', 11, 3, '100 - 250 g bags', 31.2299995, 15, 0, 0, 0);
INSERT INTO products VALUES (27, 'Schoggi Schokolade', 11, 3, '100 - 100 g pieces', 43.9000015, 49, 0, 30, 0);
INSERT INTO products VALUES (28, 'Rössle Sauerkraut', 12, 7, '25 - 825 g cans', 45.5999985, 26, 0, 0, 1);
INSERT INTO products VALUES (29, 'Thüringer Rostbratwurst', 12, 6, '50 bags x 30 sausgs.', 123.790001, 0, 0, 0, 1);
INSERT INTO products VALUES (30, 'Nord-Ost Matjeshering', 13, 8, '10 - 200 g glasses', 25.8899994, 10, 0, 15, 0);
INSERT INTO products VALUES (31, 'Gorgonzola Telino', 14, 4, '12 - 100 g pkgs', 12.5, 0, 70, 20, 0);
INSERT INTO products VALUES (32, 'Mascarpone Fabioli', 14, 4, '24 - 200 g pkgs.', 32, 9, 40, 25, 0);
INSERT INTO products VALUES (33, 'Geitost', 15, 4, '500 g', 2.5, 112, 0, 20, 0);
INSERT INTO products VALUES (34, 'Sasquatch Ale', 16, 1, '24 - 12 oz bottles', 14, 111, 0, 15, 0);
INSERT INTO products VALUES (35, 'Steeleye Stout', 16, 1, '24 - 12 oz bottles', 18, 20, 0, 15, 0);
INSERT INTO products VALUES (36, 'Inlagd Sill', 17, 8, '24 - 250 g  jars', 19, 112, 0, 20, 0);
INSERT INTO products VALUES (37, 'Gravad lax', 17, 8, '12 - 500 g pkgs.', 26, 11, 50, 25, 0);
INSERT INTO products VALUES (38, 'Côte de Blaye', 18, 1, '12 - 75 cl bottles', 263.5, 17, 0, 15, 0);
INSERT INTO products VALUES (39, 'Chartreuse verte', 18, 1, '750 cc per bottle', 18, 69, 0, 5, 0);
INSERT INTO products VALUES (40, 'Boston Crab Meat', 19, 8, '24 - 4 oz tins', 18.3999996, 123, 0, 30, 0);
INSERT INTO products VALUES (41, 'Jack''s New England Clam Chowder', 19, 8, '12 - 12 oz cans', 9.64999962, 85, 0, 10, 0);
INSERT INTO products VALUES (42, 'Singaporean Hokkien Fried Mee', 20, 5, '32 - 1 kg pkgs.', 14, 26, 0, 0, 1);
INSERT INTO products VALUES (43, 'Ipoh Coffee', 20, 1, '16 - 500 g tins', 46, 17, 10, 25, 0);
INSERT INTO products VALUES (44, 'Gula Malacca', 20, 2, '20 - 2 kg bags', 19.4500008, 27, 0, 15, 0);
INSERT INTO products VALUES (45, 'Rogede sild', 21, 8, '1k pkg.', 9.5, 5, 70, 15, 0);
INSERT INTO products VALUES (46, 'Spegesild', 21, 8, '4 - 450 g glasses', 12, 95, 0, 0, 0);
INSERT INTO products VALUES (47, 'Zaanse koeken', 22, 3, '10 - 4 oz boxes', 9.5, 36, 0, 0, 0);
INSERT INTO products VALUES (48, 'Chocolade', 22, 3, '10 pkgs.', 12.75, 15, 70, 25, 0);
INSERT INTO products VALUES (49, 'Maxilaku', 23, 3, '24 - 50 g pkgs.', 20, 10, 60, 15, 0);
INSERT INTO products VALUES (50, 'Valkoinen suklaa', 23, 3, '12 - 100 g bars', 16.25, 65, 0, 30, 0);
INSERT INTO products VALUES (51, 'Manjimup Dried Apples', 24, 7, '50 - 300 g pkgs.', 53, 20, 0, 10, 0);
INSERT INTO products VALUES (52, 'Filo Mix', 24, 5, '16 - 2 kg boxes', 7, 38, 0, 25, 0);
INSERT INTO products VALUES (53, 'Perth Pasties', 24, 6, '48 pieces', 32.7999992, 0, 0, 0, 1);
INSERT INTO products VALUES (54, 'Tourtière', 25, 6, '16 pies', 7.44999981, 21, 0, 10, 0);
INSERT INTO products VALUES (55, 'Pâté chinois', 25, 6, '24 boxes x 2 pies', 24, 115, 0, 20, 0);
INSERT INTO products VALUES (56, 'Gnocchi di nonna Alice', 26, 5, '24 - 250 g pkgs.', 38, 21, 10, 30, 0);
INSERT INTO products VALUES (57, 'Ravioli Angelo', 26, 5, '24 - 250 g pkgs.', 19.5, 36, 0, 20, 0);
INSERT INTO products VALUES (58, 'Escargots de Bourgogne', 27, 8, '24 pieces', 13.25, 62, 0, 20, 0);
INSERT INTO products VALUES (59, 'Raclette Courdavault', 28, 4, '5 kg pkg.', 55, 79, 0, 0, 0);
INSERT INTO products VALUES (60, 'Camembert Pierrot', 28, 4, '15 - 300 g rounds', 34, 19, 0, 0, 0);
INSERT INTO products VALUES (61, 'Sirop d''érable', 29, 2, '24 - 500 ml bottles', 28.5, 113, 0, 25, 0);
INSERT INTO products VALUES (62, 'Tarte au sucre', 29, 3, '48 pies', 49.2999992, 17, 0, 0, 0);
INSERT INTO products VALUES (63, 'Vegie-spread', 7, 2, '15 - 625 g jars', 43.9000015, 24, 0, 5, 0);
INSERT INTO products VALUES (64, 'Wimmers gute Semmelknödel', 12, 5, '20 bags x 4 pieces', 33.25, 22, 80, 30, 0);
INSERT INTO products VALUES (65, 'Louisiana Fiery Hot Pepper Sauce', 2, 2, '32 - 8 oz bottles', 21.0499992, 76, 0, 0, 0);
INSERT INTO products VALUES (66, 'Louisiana Hot Spiced Okra', 2, 2, '24 - 8 oz jars', 17, 4, 100, 20, 0);
INSERT INTO products VALUES (67, 'Laughing Lumberjack Lager', 16, 1, '24 - 12 oz bottles', 14, 52, 0, 10, 0);
INSERT INTO products VALUES (68, 'Scottish Longbreads', 8, 3, '10 boxes x 8 pieces', 12.5, 6, 10, 15, 0);
INSERT INTO products VALUES (69, 'Gudbrandsdalsost', 15, 4, '10 kg pkg.', 36, 26, 0, 15, 0);
INSERT INTO products VALUES (70, 'Outback Lager', 7, 1, '24 - 355 ml bottles', 15, 15, 10, 30, 0);
INSERT INTO products VALUES (71, 'Flotemysost', 15, 4, '10 - 500 g pkgs.', 21.5, 26, 0, 0, 0);
INSERT INTO products VALUES (72, 'Mozzarella di Giovanni', 14, 4, '24 - 200 g pkgs.', 34.7999992, 14, 0, 0, 0);
INSERT INTO products VALUES (73, 'Röd Kaviar', 17, 8, '24 - 150 g jars', 15, 101, 0, 5, 0);
INSERT INTO products VALUES (74, 'Longlife Tofu', 4, 7, '5 kg pkg.', 10, 4, 20, 5, 0);
INSERT INTO products VALUES (75, 'Rhönbräu Klosterbier', 12, 1, '24 - 0.5 l bottles', 7.75, 125, 0, 25, 0);
INSERT INTO products VALUES (76, 'Lakkalikööri', 23, 1, '500 ml', 18, 57, 0, 20, 0);
INSERT INTO products VALUES (77, 'Original Frankfurter grüne Soße', 12, 2, '12 boxes', 13, 32, 0, 15, 0);


--
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO region VALUES (1, 'Eastern');
INSERT INTO region VALUES (2, 'Western');
INSERT INTO region VALUES (3, 'Northern');
INSERT INTO region VALUES (4, 'Southern');


--
-- Data for Name: shippers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO shippers VALUES (1, 'Speedy Express', '(503) 555-9831');
INSERT INTO shippers VALUES (2, 'United Package', '(503) 555-3199');
INSERT INTO shippers VALUES (3, 'Federal Shipping', '(503) 555-9931');
INSERT INTO shippers VALUES (4, 'Alliance Shippers', '1-800-222-0451');
INSERT INTO shippers VALUES (5, 'UPS', '1-800-782-7892');
INSERT INTO shippers VALUES (6, 'DHL', '1-800-225-5345');



--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO suppliers VALUES (1, 'Exotic Liquids', 'Charlotte Cooper', 'Purchasing Manager', '49 Gilbert St.', 'London', NULL, 'EC1 4SD', 'UK', '(171) 555-2222', NULL, NULL);
INSERT INTO suppliers VALUES (2, 'New Orleans Cajun Delights', 'Shelley Burke', 'Order Administrator', 'P.O. Box 78934', 'New Orleans', 'LA', '70117', 'USA', '(100) 555-4822', NULL, '#CAJUN.HTM#');
INSERT INTO suppliers VALUES (3, 'Grandma Kelly''s Homestead', 'Regina Murphy', 'Sales Representative', '707 Oxford Rd.', 'Ann Arbor', 'MI', '48104', 'USA', '(313) 555-5735', '(313) 555-3349', NULL);
INSERT INTO suppliers VALUES (4, 'Tokyo Traders', 'Yoshi Nagase', 'Marketing Manager', '9-8 Sekimai Musashino-shi', 'Tokyo', NULL, '100', 'Japan', '(03) 3555-5011', NULL, NULL);
INSERT INTO suppliers VALUES (5, 'Cooperativa de Quesos ''Las Cabras''', 'Antonio del Valle Saavedra', 'Export Administrator', 'Calle del Rosal 4', 'Oviedo', 'Asturias', '33007', 'Spain', '(98) 598 76 54', NULL, NULL);
INSERT INTO suppliers VALUES (6, 'Mayumi''s', 'Mayumi Ohno', 'Marketing Representative', '92 Setsuko Chuo-ku', 'Osaka', NULL, '545', 'Japan', '(06) 431-7877', NULL, 'Mayumi''s (on the World Wide Web)#http://www.microsoft.com/accessdev/sampleapps/mayumi.htm#');
INSERT INTO suppliers VALUES (7, 'Pavlova, Ltd.', 'Ian Devling', 'Marketing Manager', '74 Rose St. Moonie Ponds', 'Melbourne', 'Victoria', '3058', 'Australia', '(03) 444-2343', '(03) 444-6588', NULL);
INSERT INTO suppliers VALUES (8, 'Specialty Biscuits, Ltd.', 'Peter Wilson', 'Sales Representative', '29 King''s Way', 'Manchester', NULL, 'M14 GSD', 'UK', '(161) 555-4448', NULL, NULL);
INSERT INTO suppliers VALUES (9, 'PB Knäckebröd AB', 'Lars Peterson', 'Sales Agent', 'Kaloadagatan 13', 'Göteborg', NULL, 'S-345 67', 'Sweden', '031-987 65 43', '031-987 65 91', NULL);
INSERT INTO suppliers VALUES (10, 'Refrescos Americanas LTDA', 'Carlos Diaz', 'Marketing Manager', 'Av. das Americanas 12.890', 'Sao Paulo', NULL, '5442', 'Brazil', '(11) 555 4640', NULL, NULL);
INSERT INTO suppliers VALUES (11, 'Heli Süßwaren GmbH & Co. KG', 'Petra Winkler', 'Sales Manager', 'Tiergartenstraße 5', 'Berlin', NULL, '10785', 'Germany', '(010) 9984510', NULL, NULL);
INSERT INTO suppliers VALUES (12, 'Plutzer Lebensmittelgroßmärkte AG', 'Martin Bein', 'International Marketing Mgr.', 'Bogenallee 51', 'Frankfurt', NULL, '60439', 'Germany', '(069) 992755', NULL, 'Plutzer (on the World Wide Web)#http://www.microsoft.com/accessdev/sampleapps/plutzer.htm#');
INSERT INTO suppliers VALUES (13, 'Nord-Ost-Fisch Handelsgesellschaft mbH', 'Sven Petersen', 'Coordinator Foreign Markets', 'Frahmredder 112a', 'Cuxhaven', NULL, '27478', 'Germany', '(04721) 8713', '(04721) 8714', NULL);
INSERT INTO suppliers VALUES (14, 'Formaggi Fortini s.r.l.', 'Elio Rossi', 'Sales Representative', 'Viale Dante, 75', 'Ravenna', NULL, '48100', 'Italy', '(0544) 60323', '(0544) 60603', '#FORMAGGI.HTM#');
INSERT INTO suppliers VALUES (15, 'Norske Meierier', 'Beate Vileid', 'Marketing Manager', 'Hatlevegen 5', 'Sandvika', NULL, '1320', 'Norway', '(0)2-953010', NULL, NULL);
INSERT INTO suppliers VALUES (16, 'Bigfoot Breweries', 'Cheryl Saylor', 'Regional Account Rep.', '3400 - 8th Avenue Suite 210', 'Bend', 'OR', '97101', 'USA', '(503) 555-9931', NULL, NULL);
INSERT INTO suppliers VALUES (17, 'Svensk Sjöföda AB', 'Michael Björn', 'Sales Representative', 'Brovallavägen 231', 'Stockholm', NULL, 'S-123 45', 'Sweden', '08-123 45 67', NULL, NULL);
INSERT INTO suppliers VALUES (18, 'Aux joyeux ecclésiastiques', 'Guylène Nodier', 'Sales Manager', '203, Rue des Francs-Bourgeois', 'Paris', NULL, '75004', 'France', '(1) 03.83.00.68', '(1) 03.83.00.62', NULL);
INSERT INTO suppliers VALUES (19, 'New England Seafood Cannery', 'Robb Merchant', 'Wholesale Account Agent', 'Order Processing Dept. 2100 Paul Revere Blvd.', 'Boston', 'MA', '02134', 'USA', '(617) 555-3267', '(617) 555-3389', NULL);
INSERT INTO suppliers VALUES (20, 'Leka Trading', 'Chandra Leka', 'Owner', '471 Serangoon Loop, Suite #402', 'Singapore', NULL, '0512', 'Singapore', '555-8787', NULL, NULL);
INSERT INTO suppliers VALUES (21, 'Lyngbysild', 'Niels Petersen', 'Sales Manager', 'Lyngbysild Fiskebakken 10', 'Lyngby', NULL, '2800', 'Denmark', '43844108', '43844115', NULL);
INSERT INTO suppliers VALUES (22, 'Zaanse Snoepfabriek', 'Dirk Luchte', 'Accounting Manager', 'Verkoop Rijnweg 22', 'Zaandam', NULL, '9999 ZZ', 'Netherlands', '(12345) 1212', '(12345) 1210', NULL);
INSERT INTO suppliers VALUES (23, 'Karkki Oy', 'Anne Heikkonen', 'Product Manager', 'Valtakatu 12', 'Lappeenranta', NULL, '53120', 'Finland', '(953) 10956', NULL, NULL);
INSERT INTO suppliers VALUES (24, 'G''day, Mate', 'Wendy Mackenzie', 'Sales Representative', '170 Prince Edward Parade Hunter''s Hill', 'Sydney', 'NSW', '2042', 'Australia', '(02) 555-5914', '(02) 555-4873', 'G''day Mate (on the World Wide Web)#http://www.microsoft.com/accessdev/sampleapps/gdaymate.htm#');
INSERT INTO suppliers VALUES (25, 'Ma Maison', 'Jean-Guy Lauzon', 'Marketing Manager', '2960 Rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canada', '(514) 555-9022', NULL, NULL);
INSERT INTO suppliers VALUES (26, 'Pasta Buttini s.r.l.', 'Giovanni Giudici', 'Order Administrator', 'Via dei Gelsomini, 153', 'Salerno', NULL, '84100', 'Italy', '(089) 6547665', '(089) 6547667', NULL);
INSERT INTO suppliers VALUES (27, 'Escargots Nouveaux', 'Marie Delamare', 'Sales Manager', '22, rue H. Voiron', 'Montceau', NULL, '71300', 'France', '85.57.00.07', NULL, NULL);
INSERT INTO suppliers VALUES (28, 'Gai pâturage', 'Eliane Noz', 'Sales Representative', 'Bat. B 3, rue des Alpes', 'Annecy', NULL, '74000', 'France', '38.76.98.06', '38.76.98.58', NULL);
INSERT INTO suppliers VALUES (29, 'Forêts d''érables', 'Chantal Goulet', 'Accounting Manager', '148 rue Chasseur', 'Ste-Hyacinthe', 'Québec', 'J2S 7S8', 'Canada', '(514) 555-2955', '(514) 555-2921', NULL);


--
-- Data for Name: territories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO territories VALUES ('01581', 'Westboro', 1);
INSERT INTO territories VALUES ('01730', 'Bedford', 1);
INSERT INTO territories VALUES ('01833', 'Georgetow', 1);
INSERT INTO territories VALUES ('02116', 'Boston', 1);
INSERT INTO territories VALUES ('02139', 'Cambridge', 1);
INSERT INTO territories VALUES ('02184', 'Braintree', 1);
INSERT INTO territories VALUES ('02903', 'Providence', 1);
INSERT INTO territories VALUES ('03049', 'Hollis', 3);
INSERT INTO territories VALUES ('03801', 'Portsmouth', 3);
INSERT INTO territories VALUES ('06897', 'Wilton', 1);
INSERT INTO territories VALUES ('07960', 'Morristown', 1);
INSERT INTO territories VALUES ('08837', 'Edison', 1);
INSERT INTO territories VALUES ('10019', 'New York', 1);
INSERT INTO territories VALUES ('10038', 'New York', 1);
INSERT INTO territories VALUES ('11747', 'Mellvile', 1);
INSERT INTO territories VALUES ('14450', 'Fairport', 1);
INSERT INTO territories VALUES ('19428', 'Philadelphia', 3);
INSERT INTO territories VALUES ('19713', 'Neward', 1);
INSERT INTO territories VALUES ('20852', 'Rockville', 1);
INSERT INTO territories VALUES ('27403', 'Greensboro', 1);
INSERT INTO territories VALUES ('27511', 'Cary', 1);
INSERT INTO territories VALUES ('29202', 'Columbia', 4);
INSERT INTO territories VALUES ('30346', 'Atlanta', 4);
INSERT INTO territories VALUES ('31406', 'Savannah', 4);
INSERT INTO territories VALUES ('32859', 'Orlando', 4);
INSERT INTO territories VALUES ('33607', 'Tampa', 4);
INSERT INTO territories VALUES ('40222', 'Louisville', 1);
INSERT INTO territories VALUES ('44122', 'Beachwood', 3);
INSERT INTO territories VALUES ('45839', 'Findlay', 3);
INSERT INTO territories VALUES ('48075', 'Southfield', 3);
INSERT INTO territories VALUES ('48084', 'Troy', 3);
INSERT INTO territories VALUES ('48304', 'Bloomfield Hills', 3);
INSERT INTO territories VALUES ('53404', 'Racine', 3);
INSERT INTO territories VALUES ('55113', 'Roseville', 3);
INSERT INTO territories VALUES ('55439', 'Minneapolis', 3);
INSERT INTO territories VALUES ('60179', 'Hoffman Estates', 2);
INSERT INTO territories VALUES ('60601', 'Chicago', 2);
INSERT INTO territories VALUES ('72716', 'Bentonville', 4);
INSERT INTO territories VALUES ('75234', 'Dallas', 4);
INSERT INTO territories VALUES ('78759', 'Austin', 4);
INSERT INTO territories VALUES ('80202', 'Denver', 2);
INSERT INTO territories VALUES ('80909', 'Colorado Springs', 2);
INSERT INTO territories VALUES ('85014', 'Phoenix', 2);
INSERT INTO territories VALUES ('85251', 'Scottsdale', 2);
INSERT INTO territories VALUES ('90405', 'Santa Monica', 2);
INSERT INTO territories VALUES ('94025', 'Menlo Park', 2);
INSERT INTO territories VALUES ('94105', 'San Francisco', 2);
INSERT INTO territories VALUES ('95008', 'Campbell', 2);
INSERT INTO territories VALUES ('95054', 'Santa Clara', 2);
INSERT INTO territories VALUES ('95060', 'Santa Cruz', 2);
INSERT INTO territories VALUES ('98004', 'Bellevue', 2);
INSERT INTO territories VALUES ('98052', 'Redmond', 2);
INSERT INTO territories VALUES ('98104', 'Seattle', 2);


--
-- Data for Name: us_states; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO us_states VALUES (1, 'Alabama', 'AL', 'south');
INSERT INTO us_states VALUES (2, 'Alaska', 'AK', 'north');
INSERT INTO us_states VALUES (3, 'Arizona', 'AZ', 'west');
INSERT INTO us_states VALUES (4, 'Arkansas', 'AR', 'south');
INSERT INTO us_states VALUES (5, 'California', 'CA', 'west');
INSERT INTO us_states VALUES (6, 'Colorado', 'CO', 'west');
INSERT INTO us_states VALUES (7, 'Connecticut', 'CT', 'east');
INSERT INTO us_states VALUES (8, 'Delaware', 'DE', 'east');
INSERT INTO us_states VALUES (9, 'District of Columbia', 'DC', 'east');
INSERT INTO us_states VALUES (10, 'Florida', 'FL', 'south');
INSERT INTO us_states VALUES (11, 'Georgia', 'GA', 'south');
INSERT INTO us_states VALUES (12, 'Hawaii', 'HI', 'west');
INSERT INTO us_states VALUES (13, 'Idaho', 'ID', 'midwest');
INSERT INTO us_states VALUES (14, 'Illinois', 'IL', 'midwest');
INSERT INTO us_states VALUES (15, 'Indiana', 'IN', 'midwest');
INSERT INTO us_states VALUES (16, 'Iowa', 'IO', 'midwest');
INSERT INTO us_states VALUES (17, 'Kansas', 'KS', 'midwest');
INSERT INTO us_states VALUES (18, 'Kentucky', 'KY', 'south');
INSERT INTO us_states VALUES (19, 'Louisiana', 'LA', 'south');
INSERT INTO us_states VALUES (20, 'Maine', 'ME', 'north');
INSERT INTO us_states VALUES (21, 'Maryland', 'MD', 'east');
INSERT INTO us_states VALUES (22, 'Massachusetts', 'MA', 'north');
INSERT INTO us_states VALUES (23, 'Michigan', 'MI', 'north');
INSERT INTO us_states VALUES (24, 'Minnesota', 'MN', 'north');
INSERT INTO us_states VALUES (25, 'Mississippi', 'MS', 'south');
INSERT INTO us_states VALUES (26, 'Missouri', 'MO', 'south');
INSERT INTO us_states VALUES (27, 'Montana', 'MT', 'west');
INSERT INTO us_states VALUES (28, 'Nebraska', 'NE', 'midwest');
INSERT INTO us_states VALUES (29, 'Nevada', 'NV', 'west');
INSERT INTO us_states VALUES (30, 'New Hampshire', 'NH', 'east');
INSERT INTO us_states VALUES (31, 'New Jersey', 'NJ', 'east');
INSERT INTO us_states VALUES (32, 'New Mexico', 'NM', 'west');
INSERT INTO us_states VALUES (33, 'New York', 'NY', 'east');
INSERT INTO us_states VALUES (34, 'North Carolina', 'NC', 'east');
INSERT INTO us_states VALUES (35, 'North Dakota', 'ND', 'midwest');
INSERT INTO us_states VALUES (36, 'Ohio', 'OH', 'midwest');
INSERT INTO us_states VALUES (37, 'Oklahoma', 'OK', 'midwest');
INSERT INTO us_states VALUES (38, 'Oregon', 'OR', 'west');
INSERT INTO us_states VALUES (39, 'Pennsylvania', 'PA', 'east');
INSERT INTO us_states VALUES (40, 'Rhode Island', 'RI', 'east');
INSERT INTO us_states VALUES (41, 'South Carolina', 'SC', 'east');
INSERT INTO us_states VALUES (42, 'South Dakota', 'SD', 'midwest');
INSERT INTO us_states VALUES (43, 'Tennessee', 'TN', 'midwest');
INSERT INTO us_states VALUES (44, 'Texas', 'TX', 'west');
INSERT INTO us_states VALUES (45, 'Utah', 'UT', 'west');
INSERT INTO us_states VALUES (46, 'Vermont', 'VT', 'east');
INSERT INTO us_states VALUES (47, 'Virginia', 'VA', 'east');
INSERT INTO us_states VALUES (48, 'Washington', 'WA', 'west');
INSERT INTO us_states VALUES (49, 'West Virginia', 'WV', 'south');
INSERT INTO us_states VALUES (50, 'Wisconsin', 'WI', 'midwest');
INSERT INTO us_states VALUES (51, 'Wyoming', 'WY', 'west');


--
-- Name: pk_categories; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY categories
    ADD CONSTRAINT pk_categories PRIMARY KEY (category_id);






--
-- Name: pk_customers; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY customers
    ADD CONSTRAINT pk_customers PRIMARY KEY (customer_id);


--
-- Name: pk_employees; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY employees
    ADD CONSTRAINT pk_employees PRIMARY KEY (employee_id);


--
-- Name: pk_employee_territories; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY employee_territories
    ADD CONSTRAINT pk_employee_territories PRIMARY KEY (employee_id, territory_id);


--
-- Name: pk_order_details; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY order_details
    ADD CONSTRAINT pk_order_details PRIMARY KEY (order_id, product_id);


--
-- Name: pk_orders; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT pk_orders PRIMARY KEY (order_id);


--
-- Name: pk_products; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY products
    ADD CONSTRAINT pk_products PRIMARY KEY (product_id);


--
-- Name: pk_region; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY region
    ADD CONSTRAINT pk_region PRIMARY KEY (region_id);


--
-- Name: pk_shippers; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY shippers
    ADD CONSTRAINT pk_shippers PRIMARY KEY (shipper_id);


--
-- Name: pk_suppliers; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY suppliers
    ADD CONSTRAINT pk_suppliers PRIMARY KEY (supplier_id);


--
-- Name: pk_territories; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY territories
    ADD CONSTRAINT pk_territories PRIMARY KEY (territory_id);


--
-- Name: pk_usstates; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY us_states
    ADD CONSTRAINT pk_usstates PRIMARY KEY (state_id);


--
-- Name: fk_orders_customers; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id) REFERENCES customers;


--
-- Name: fk_orders_employees; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT fk_orders_employees FOREIGN KEY (employee_id) REFERENCES employees;


--
-- Name: fk_orders_shippers; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT fk_orders_shippers FOREIGN KEY (ship_via) REFERENCES shippers;


--
-- Name: fk_order_details_products; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY order_details
    ADD CONSTRAINT fk_order_details_products FOREIGN KEY (product_id) REFERENCES products;


--
-- Name: fk_order_details_orders; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY order_details
    ADD CONSTRAINT fk_order_details_orders FOREIGN KEY (order_id) REFERENCES orders;


--
-- Name: fk_products_categories; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY products
    ADD CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories;


--
-- Name: fk_products_suppliers; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY products
    ADD CONSTRAINT fk_products_suppliers FOREIGN KEY (supplier_id) REFERENCES suppliers;


--
-- Name: fk_territories_region; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY territories
    ADD CONSTRAINT fk_territories_region FOREIGN KEY (region_id) REFERENCES region;


--
-- Name: fk_employee_territories_territories; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY employee_territories
    ADD CONSTRAINT fk_employee_territories_territories FOREIGN KEY (territory_id) REFERENCES territories;


--
-- Name: fk_employee_territories_employees; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY employee_territories
    ADD CONSTRAINT fk_employee_territories_employees FOREIGN KEY (employee_id) REFERENCES employees;






--
-- Name: fk_employees_employees; Type: Constraint; Schema: -; Owner: -
--

ALTER TABLE ONLY employees
    ADD CONSTRAINT fk_employees_employees FOREIGN KEY (reports_to) REFERENCES employees;

--
-- After loading this dump, apply PII enrichment for PIIGuard Shield demo:
--   psql -f northwind_pii_enrichment.sql
-- Or: python scripts/gen_northwind_pii_patch.py  (regenerate) then apply.
--

    
--
-- PostgreSQL database dump complete
--

-- ========== PART 2: PII ENRICHMENT ==========

--
-- PII enrichment for Northwind — synthetic Vietnam-style PII for PIIGuard demo
-- 100% fake data. Apply AFTER northwind.sql
-- Usage: psql -f northwind.sql && psql -f northwind_pii_enrichment.sql
--

BEGIN;

-- ----- Alter existing tables -----
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS email character varying(80),
    ADD COLUMN IF NOT EXISTS mobile_phone character varying(20),
    ADD COLUMN IF NOT EXISTS cccd character varying(12),
    ADD COLUMN IF NOT EXISTS date_of_birth date,
    ADD COLUMN IF NOT EXISTS tax_code character varying(13),
    ADD COLUMN IF NOT EXISTS personal_notes text,
    ADD COLUMN IF NOT EXISTS c1 character varying(20),
    ADD COLUMN IF NOT EXISTS c2 character varying(12);

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS personal_email character varying(80),
    ADD COLUMN IF NOT EXISTS cccd character varying(12),
    ADD COLUMN IF NOT EXISTS mobile_phone character varying(20),
    ADD COLUMN IF NOT EXISTS tax_code character varying(13);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_cccd character varying(12),
    ADD COLUMN IF NOT EXISTS ship_phone character varying(20),
    ADD COLUMN IF NOT EXISTS tracking_code character varying(20),
    ADD COLUMN IF NOT EXISTS order_notes text;

ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS contact_email character varying(80),
    ADD COLUMN IF NOT EXISTS tax_code character varying(13),
    ADD COLUMN IF NOT EXISTS contact_cccd character varying(12);

DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS kyc_documents;

CREATE TABLE support_tickets (
    ticket_id serial PRIMARY KEY,
    customer_id character varying(5) NOT NULL REFERENCES customers(customer_id),
    order_id smallint REFERENCES orders(order_id),
    subject character varying(120),
    body text NOT NULL,
    status character varying(20) DEFAULT 'open',
    created_at date DEFAULT CURRENT_DATE
);

CREATE TABLE kyc_documents (
    doc_id serial PRIMARY KEY,
    customer_id character varying(5) NOT NULL REFERENCES customers(customer_id),
    doc_type character varying(30) NOT NULL,
    file_path character varying(255) NOT NULL,
    ocr_text text,
    uploaded_at date DEFAULT CURRENT_DATE
);

-- ----- Enrich customers -----
UPDATE customers SET email='alfki.0712@example.vn', mobile_phone='0327540543', cccd='033254456184', date_of_birth=DATE '1967-11-24', tax_code='4518834201', personal_notes='LH 0327540543; CCCD 033254456184. Don hang cu #152506320724 da giao. Email backup: alfki.0712@example.vn', phone='0327540543' WHERE customer_id='ALFKI';
UPDATE customers SET email='anatr.3844@example.vn', mobile_phone='0336059364', cccd='040280283936', date_of_birth=DATE '1963-01-18', tax_code='2890241933', personal_notes='LH 0336059364; CCCD 040280283936. Don hang cu #683201500090 da giao. Email backup: anatr.3844@example.vn', phone='0336059364' WHERE customer_id='ANATR';
UPDATE customers SET email='anton.6311@example.vn', mobile_phone='0940454294', cccd='048221541620', date_of_birth=DATE '1988-06-11', tax_code='3575164574', personal_notes='LH 0940454294; CCCD 048221541620. Don hang cu #158503381327 da giao. Email backup: anton.6311@example.vn', phone='0940454294' WHERE customer_id='ANTON';
UPDATE customers SET email='arout.5404@example.vn', mobile_phone='0347084243', cccd='092223119120', date_of_birth=DATE '1979-11-11', tax_code='2256332212', personal_notes='LH 0347084243; CCCD 092223119120. Don hang cu #110239121292 da giao. Email backup: arout.5404@example.vn', phone='0347084243' WHERE customer_id='AROUT';
UPDATE customers SET email='bergs.8183@example.vn', mobile_phone='0989403235', cccd='079265505644', date_of_birth=DATE '1971-06-04', tax_code='0509146619', personal_notes='LH 0989403235; CCCD 079265505644. Don hang cu #064017068890 da giao. Email backup: bergs.8183@example.vn', phone='0989403235' WHERE customer_id='BERGS';
UPDATE customers SET email='blaus.4708@example.vn', mobile_phone='0935506730', cccd='033226374328', date_of_birth=DATE '1972-07-16', tax_code='5438430592', personal_notes='LH 0935506730; CCCD 033226374328. Don hang cu #831286536245 da giao. Email backup: blaus.4708@example.vn', phone='0935506730' WHERE customer_id='BLAUS';
UPDATE customers SET email='blonp.3962@example.vn', mobile_phone='0349312006', cccd='046234423770', date_of_birth=DATE '1964-09-01', tax_code='5776055022', personal_notes='LH 0349312006; CCCD 046234423770. Don hang cu #155173281014 da giao. Email backup: blonp.3962@example.vn', phone='0349312006' WHERE customer_id='BLONP';
UPDATE customers SET email='bolid.3153@example.vn', mobile_phone='0911330041', cccd='079261880141', date_of_birth=DATE '1991-04-21', tax_code='0204525262', personal_notes='LH 0911330041; CCCD 079261880141. Don hang cu #110431208081 da giao. Email backup: bolid.3153@example.vn', phone='0911330041' WHERE customer_id='BOLID';
UPDATE customers SET email='bonap.2765@example.vn', mobile_phone='0375341004', cccd='033222229438', date_of_birth=DATE '1987-11-05', tax_code='6941993500', personal_notes='LH 0375341004; CCCD 033222229438. Don hang cu #403562325443 da giao. Email backup: bonap.2765@example.vn', phone='0375341004' WHERE customer_id='BONAP';
UPDATE customers SET email='bottm.9301@example.vn', mobile_phone='0941560135', cccd='048221040674', date_of_birth=DATE '1983-02-16', tax_code='1034747385', personal_notes='LH 0941560135; CCCD 048221040674. Don hang cu #824108144025 da giao. Email backup: bottm.9301@example.vn', phone='0941560135' WHERE customer_id='BOTTM';
UPDATE customers SET email='bsbev.5041@example.vn', mobile_phone='0973244980', cccd='001210636233', date_of_birth=DATE '1975-06-05', tax_code='1573116617', personal_notes='LH 0973244980; CCCD 001210636233. Don hang cu #335549154105 da giao. Email backup: bsbev.5041@example.vn', phone='0973244980' WHERE customer_id='BSBEV';
UPDATE customers SET email='cactu.6316@example.vn', mobile_phone='0948987319', cccd='048210492418', date_of_birth=DATE '1988-07-15', tax_code='3333143808', personal_notes='LH 0948987319; CCCD 048210492418. Don hang cu #540620931664 da giao. Email backup: cactu.6316@example.vn', phone='0948987319' WHERE customer_id='CACTU';
UPDATE customers SET email='centc.2317@example.vn', mobile_phone='0330631139', cccd='048230628024', date_of_birth=DATE '1983-07-24', tax_code='6406548222', personal_notes='LH 0330631139; CCCD 048230628024. Don hang cu #040396530001 da giao. Email backup: centc.2317@example.vn', phone='0330631139' WHERE customer_id='CENTC';
UPDATE customers SET email='chops.0320@example.vn', mobile_phone='0942650785', cccd='048210984228', date_of_birth=DATE '1963-09-04', tax_code='5146273762', personal_notes='LH 0942650785; CCCD 048210984228. Don hang cu #019941489199 da giao. Email backup: chops.0320@example.vn', phone='0942650785' WHERE customer_id='CHOPS';
UPDATE customers SET email='commi.6355@example.vn', mobile_phone='0946623143', cccd='048261171560', date_of_birth=DATE '1988-02-14', tax_code='9050205875', personal_notes='LH 0946623143; CCCD 048261171560. Don hang cu #045222111401 da giao. Email backup: commi.6355@example.vn', phone='0946623143' WHERE customer_id='COMMI';
UPDATE customers SET email='consh.5057@example.vn', mobile_phone='0975238362', cccd='001229650685', date_of_birth=DATE '1975-12-04', tax_code='3376948094', personal_notes='LH 0975238362; CCCD 001229650685. Don hang cu #065241029325 da giao. Email backup: consh.5057@example.vn', phone='0975238362' WHERE customer_id='CONSH';
UPDATE customers SET email='dracd.2521@example.vn', mobile_phone='0352517205', cccd='056271744241', date_of_birth=DATE '1985-06-15', tax_code='0044124841', personal_notes='LH 0352517205; CCCD 056271744241. Don hang cu #508230140623 da giao. Email backup: dracd.2521@example.vn', phone='0352517205' WHERE customer_id='DRACD';
UPDATE customers SET email='dumon.8212@example.vn', mobile_phone='0320541192', cccd='031267344633', date_of_birth=DATE '1972-12-08', tax_code='5502213423', personal_notes='LH 0320541192; CCCD 031267344633. Don hang cu #454281909477 da giao. Email backup: dumon.8212@example.vn', phone='0320541192' WHERE customer_id='DUMON';
UPDATE customers SET email='eastc.3110@example.vn', mobile_phone='0915035989', cccd='079267043122', date_of_birth=DATE '1991-05-23', tax_code='5224253230', personal_notes='LH 0915035989; CCCD 079267043122. Don hang cu #235324412219 da giao. Email backup: eastc.3110@example.vn', phone='0915035989' WHERE customer_id='EASTC';
UPDATE customers SET email='ernsh.3206@example.vn', mobile_phone='0935900762', cccd='031254533090', date_of_birth=DATE '1992-05-07', tax_code='7404033136', personal_notes='LH 0935900762; CCCD 031254533090. Don hang cu #459141439612 da giao. Email backup: ernsh.3206@example.vn', phone='0935900762' WHERE customer_id='ERNSH';
UPDATE customers SET email='famia.3439@example.vn', mobile_phone='0960687537', cccd='092241961807', date_of_birth=DATE '1994-02-28', tax_code='3531366721', personal_notes='LH 0960687537; CCCD 092241961807. Don hang cu #621953056340 da giao. Email backup: famia.3439@example.vn', phone='0960687537' WHERE customer_id='FAMIA';
UPDATE customers SET email='fissa.9254@example.vn', mobile_phone='0937540470', cccd='031223940817', date_of_birth=DATE '1982-05-11', tax_code='3576838310', personal_notes='LH 0937540470; CCCD 031223940817. Don hang cu #543603325402 da giao. Email backup: fissa.9254@example.vn', phone='0937540470' WHERE customer_id='FISSA';
UPDATE customers SET email='folig.0232@example.vn', mobile_phone='0933303034', cccd='031249679568', date_of_birth=DATE '1962-04-14', tax_code='4731005093', personal_notes='LH 0933303034; CCCD 031249679568. Don hang cu #183413753031 da giao. Email backup: folig.0232@example.vn', phone='0933303034' WHERE customer_id='FOLIG';
UPDATE customers SET email='folko.2424@example.vn', mobile_phone='0343679171', cccd='092274529665', date_of_birth=DATE '1984-11-02', tax_code='7060381858', personal_notes='LH 0343679171; CCCD 092274529665. Don hang cu #425408833128 da giao. Email backup: folko.2424@example.vn', phone='0343679171' WHERE customer_id='FOLKO';
UPDATE customers SET email='frank.7518@example.vn', mobile_phone='0901360404', cccd='056253350043', date_of_birth=DATE '1965-01-01', tax_code='7311260853', personal_notes='LH 0901360404; CCCD 056253350043. Don hang cu #311225997202 da giao. Email backup: frank.7518@example.vn', phone='0901360404' WHERE customer_id='FRANK';
UPDATE customers SET email='franr.2652@example.vn', mobile_phone='0364222314', cccd='038271911005', date_of_birth=DATE '1986-03-02', tax_code='0031465742', personal_notes='LH 0364222314; CCCD 038271911005. Don hang cu #305831059544 da giao. Email backup: franr.2652@example.vn', phone='0364222314' WHERE customer_id='FRANR';
UPDATE customers SET email='frans.4235@example.vn', mobile_phone='0373124147', cccd='031225011357', date_of_birth=DATE '1967-09-03', tax_code='5952482803', personal_notes='LH 0373124147; CCCD 031225011357. Don hang cu #345371053141 da giao. Email backup: frans.4235@example.vn', phone='0373124147' WHERE customer_id='FRANS';
UPDATE customers SET email='furib.4321@example.vn', mobile_phone='0383044083', cccd='048225053552', date_of_birth=DATE '1968-12-06', tax_code='2350917374', personal_notes='LH 0383044083; CCCD 048225053552. Don hang cu #237927128031 da giao. Email backup: furib.4321@example.vn', phone='0383044083' WHERE customer_id='FURIB';
UPDATE customers SET email='galed.0227@example.vn', mobile_phone='0932481255', cccd='031227576727', date_of_birth=DATE '1962-04-20', tax_code='7654009810', personal_notes='LH 0932481255; CCCD 031227576727. Don hang cu #315212346419 da giao. Email backup: galed.0227@example.vn', phone='0932481255' WHERE customer_id='GALED';
UPDATE customers SET email='godos.0215@example.vn', mobile_phone='0931229404', cccd='031223803463', date_of_birth=DATE '1962-06-14', tax_code='0201131432', personal_notes='LH 0931229404; CCCD 031223803463. Don hang cu #805051061157 da giao. Email backup: godos.0215@example.vn', phone='0931229404' WHERE customer_id='GODOS';
UPDATE customers SET email='gourl.8231@example.vn', mobile_phone='0322049849', cccd='031284043040', date_of_birth=DATE '1972-10-08', tax_code='7831531651', personal_notes='LH 0322049849; CCCD 031284043040. Don hang cu #462465571919 da giao. Email backup: gourl.8231@example.vn', phone='0322049849' WHERE customer_id='GOURL';
UPDATE customers SET email='greal.5441@example.vn', mobile_phone='0341388241', cccd='092244057004', date_of_birth=DATE '1979-12-24', tax_code='8400360341', personal_notes='LH 0341388241; CCCD 092244057004. Don hang cu #295181531196 da giao. Email backup: greal.5441@example.vn', phone='0341388241' WHERE customer_id='GREAL';
UPDATE customers SET email='grosr.7232@example.vn', mobile_phone='0379842506', cccd='031234758892', date_of_birth=DATE '1962-06-05', tax_code='1542975148', personal_notes='LH 0379842506; CCCD 031234758892. Don hang cu #683747241940 da giao. Email backup: grosr.7232@example.vn', phone='0379842506' WHERE customer_id='GROSR';
UPDATE customers SET email='hanar.5350@example.vn', mobile_phone='0334375164', cccd='048283534450', date_of_birth=DATE '1978-12-19', tax_code='2058960480', personal_notes='LH 0334375164; CCCD 048283534450. Don hang cu #883748273159 da giao. Email backup: hanar.5350@example.vn', phone='0334375164' WHERE customer_id='HANAR';
UPDATE customers SET email='hilaa.9157@example.vn', mobile_phone='0919417228', cccd='079213257230', date_of_birth=DATE '1981-05-16', tax_code='0055677324', personal_notes='LH 0919417228; CCCD 079213257230. Don hang cu #157037510651 da giao. Email backup: hilaa.9157@example.vn', phone='0919417228' WHERE customer_id='HILAA';
UPDATE customers SET email='hungc.1430@example.vn', mobile_phone='0395249595', cccd='092210431243', date_of_birth=DATE '1974-08-10', tax_code='1008188341', personal_notes='LH 0395249595; CCCD 092210431243. Don hang cu #291450512876 da giao. Email backup: hungc.1430@example.vn', phone='0395249595' WHERE customer_id='HUNGC';
UPDATE customers SET email='hungo.5152@example.vn', mobile_phone='0982961025', cccd='079265313420', date_of_birth=DATE '1976-05-02', tax_code='3324277194', personal_notes='LH 0982961025; CCCD 079265313420. Don hang cu #434324620565 da giao. Email backup: hungo.5152@example.vn', phone='0982961025' WHERE customer_id='HUNGO';
UPDATE customers SET email='islat.0523@example.vn', mobile_phone='0972814590', cccd='056236234103', date_of_birth=DATE '1965-01-07', tax_code='5340749892', personal_notes='LH 0972814590; CCCD 056236234103. Don hang cu #408432716014 da giao. Email backup: islat.0523@example.vn', phone='0972814590' WHERE customer_id='ISLAT';
UPDATE customers SET email='koene.0530@example.vn', mobile_phone='0972331255', cccd='056265265304', date_of_birth=DATE '1965-10-01', tax_code='9141325651', personal_notes='LH 0972331255; CCCD 056265265304. Don hang cu #341243773013 da giao. Email backup: koene.0530@example.vn', phone='0972331255' WHERE customer_id='KOENE';
UPDATE customers SET email='lacor.3183@example.vn', mobile_phone='0915245244', cccd='079240834146', date_of_birth=DATE '1991-10-14', tax_code='4474217116', personal_notes='LH 0915245244; CCCD 079240834146. Don hang cu #242057760994 da giao. Email backup: lacor.3183@example.vn', phone='0915245244' WHERE customer_id='LACOR';
UPDATE customers SET email='lamai.2394@example.vn', mobile_phone='0332950110', cccd='048226733932', date_of_birth=DATE '1983-05-18', tax_code='1354255761', personal_notes='LH 0332950110; CCCD 048226733932. Don hang cu #622541454681 da giao. Email backup: lamai.2394@example.vn', phone='0332950110' WHERE customer_id='LAMAI';
UPDATE customers SET email='laugb.4590@example.vn', mobile_phone='0909376851', cccd='056228744750', date_of_birth=DATE '1970-03-15', tax_code='2356536101', personal_notes='LH 0909376851; CCCD 056228744750. Don hang cu #631320767000 da giao. Email backup: laugb.4590@example.vn', phone='0909376851' WHERE customer_id='LAUGB';
UPDATE customers SET email='lazyk.2301@example.vn', mobile_phone='0332992379', cccd='048253866041', date_of_birth=DATE '1983-12-04', tax_code='0789660464', personal_notes='LH 0332992379; CCCD 048253866041. Don hang cu #546295515252 da giao. Email backup: lazyk.2301@example.vn', phone='0332992379' WHERE customer_id='LAZYK';
UPDATE customers SET email='lehms.5418@example.vn', mobile_phone='0340203015', cccd='092285253915', date_of_birth=DATE '1979-03-25', tax_code='3142049201', personal_notes='LH 0340203015; CCCD 092285253915. Don hang cu #025360812421 da giao. Email backup: lehms.5418@example.vn', phone='0340203015' WHERE customer_id='LEHMS';
UPDATE customers SET email='letss.4335@example.vn', mobile_phone='0389735053', cccd='048262272324', date_of_birth=DATE '1968-01-08', tax_code='6212452523', personal_notes='LH 0389735053; CCCD 048262272324. Don hang cu #122141203223 da giao. Email backup: letss.4335@example.vn', phone='0389735053' WHERE customer_id='LETSS';
UPDATE customers SET email='lilas.0417@example.vn', mobile_phone='0961553845', cccd='092261351332', date_of_birth=DATE '1964-07-17', tax_code='3416312599', personal_notes='LH 0961553845; CCCD 092261351332. Don hang cu #423038292663 da giao. Email backup: lilas.0417@example.vn', phone='0961553845' WHERE customer_id='LILAS';
UPDATE customers SET email='linod.5032@example.vn', mobile_phone='0970893344', cccd='001217423492', date_of_birth=DATE '1975-11-09', tax_code='2656242592', personal_notes='LH 0970893344; CCCD 001217423492. Don hang cu #191345400877 da giao. Email backup: linod.5032@example.vn', phone='0970893344' WHERE customer_id='LINOD';
UPDATE customers SET email='lonep.2157@example.vn', mobile_phone='0981537836', cccd='079219717457', date_of_birth=DATE '1981-08-03', tax_code='4503423031', personal_notes='LH 0981537836; CCCD 079219717457. Don hang cu #550403775525 da giao. Email backup: lonep.2157@example.vn', phone='0981537836' WHERE customer_id='LONEP';
UPDATE customers SET email='magaa.9143@example.vn', mobile_phone='0910563543', cccd='079212457642', date_of_birth=DATE '1981-12-10', tax_code='6442807475', personal_notes='LH 0910563543; CCCD 079212457642. Don hang cu #775340504831 da giao. Email backup: magaa.9143@example.vn', phone='0910563543' WHERE customer_id='MAGAA';
UPDATE customers SET email='maisd.7450@example.vn', mobile_phone='0396344002', cccd='092211651262', date_of_birth=DATE '1964-04-01', tax_code='5230001611', personal_notes='LH 0396344002; CCCD 092211651262. Don hang cu #493851343270 da giao. Email backup: maisd.7450@example.vn', phone='0396344002' WHERE customer_id='MAISD';
UPDATE customers SET email='merep.2700@example.vn', mobile_phone='0375113756', cccd='033223595251', date_of_birth=DATE '1987-08-14', tax_code='2425221404', personal_notes='LH 0375113756; CCCD 033223595251. Don hang cu #451769806817 da giao. Email backup: merep.2700@example.vn', phone='0375113756' WHERE customer_id='MEREP';
UPDATE customers SET email='morgk.4226@example.vn', mobile_phone='0375574212', cccd='031261827644', date_of_birth=DATE '1967-08-15', tax_code='2610914040', personal_notes='LH 0375574212; CCCD 031261827644. Don hang cu #315486541856 da giao. Email backup: morgk.4226@example.vn', phone='0375574212' WHERE customer_id='MORGK';
UPDATE customers SET email='norts.5134@example.vn', mobile_phone='0982821437', cccd='079246856774', date_of_birth=DATE '1976-08-02', tax_code='2512621560', personal_notes='LH 0982821437; CCCD 079246856774. Don hang cu #945411253527 da giao. Email backup: norts.5134@example.vn', phone='0982821437' WHERE customer_id='NORTS';
UPDATE customers SET email='ocean.3832@example.vn', mobile_phone='0333358515', cccd='040215439252', date_of_birth=DATE '1963-08-19', tax_code='7214550885', personal_notes='LH 0333358515; CCCD 040215439252. Don hang cu #018441042224 da giao. Email backup: ocean.3832@example.vn', phone='0333358515' WHERE customer_id='OCEAN';
UPDATE customers SET email='oldwo.3290@example.vn', mobile_phone='0933307042', cccd='031257553555', date_of_birth=DATE '1992-08-23', tax_code='0423468465', personal_notes='LH 0933307042; CCCD 031257553555. Don hang cu #972328200503 da giao. Email backup: oldwo.3290@example.vn', phone='0933307042' WHERE customer_id='OLDWO';
UPDATE customers SET email='ottik.5441@example.vn', mobile_phone='0345626133', cccd='092220520021', date_of_birth=DATE '1979-10-01', tax_code='1049278043', personal_notes='LH 0345626133; CCCD 092220520021. Don hang cu #913271610745 da giao. Email backup: ottik.5441@example.vn', phone='0345626133' WHERE customer_id='OTTIK';
UPDATE customers SET email='paris.4501@example.vn', mobile_phone='0908287802', cccd='056236709412', date_of_birth=DATE '1970-01-24', tax_code='7679341430', personal_notes='LH 0908287802; CCCD 056236709412. Don hang cu #011492435353 da giao. Email backup: paris.4501@example.vn', phone='0908287802' WHERE customer_id='PARIS';
UPDATE customers SET email='peric.5251@example.vn', mobile_phone='0324281949', cccd='031252613701', date_of_birth=DATE '1977-10-15', tax_code='4479351656', personal_notes='LH 0324281949; CCCD 031252613701. Don hang cu #027923302434 da giao. Email backup: peric.5251@example.vn', phone='0324281949' WHERE customer_id='PERIC';
UPDATE customers SET email='picco.7436@example.vn', mobile_phone='0395462700', cccd='092239621798', date_of_birth=DATE '1964-03-25', tax_code='7971160541', personal_notes='LH 0395462700; CCCD 092239621798. Don hang cu #714717835028 da giao. Email backup: picco.7436@example.vn', phone='0395462700' WHERE customer_id='PICCO';
UPDATE customers SET email='prini.2754@example.vn', mobile_phone='0377951874', cccd='033250235555', date_of_birth=DATE '1987-12-12', tax_code='4946519400', personal_notes='LH 0377951874; CCCD 033250235555. Don hang cu #302450016605 da giao. Email backup: prini.2754@example.vn', phone='0377951874' WHERE customer_id='PRINI';
UPDATE customers SET email='quede.4190@example.vn', mobile_phone='0364875080', cccd='079215955122', date_of_birth=DATE '1966-10-04', tax_code='6155811150', personal_notes='LH 0364875080; CCCD 079215955122. Don hang cu #480673579559 da giao. Email backup: quede.4190@example.vn', phone='0364875080' WHERE customer_id='QUEDE';
UPDATE customers SET email='queen.5916@example.vn', mobile_phone='0395103319', cccd='046219121351', date_of_birth=DATE '1984-01-15', tax_code='5056994002', personal_notes='LH 0395103319; CCCD 046219121351. Don hang cu #931046291634 da giao. Email backup: queen.5916@example.vn', phone='0395103319' WHERE customer_id='QUEEN';
UPDATE customers SET email='quick.4027@example.vn', mobile_phone='0355005443', cccd='001261085930', date_of_birth=DATE '1965-07-10', tax_code='5326513400', personal_notes='LH 0355005443; CCCD 001261085930. Don hang cu #800434113904 da giao. Email backup: quick.4027@example.vn', phone='0355005443' WHERE customer_id='QUICK';
UPDATE customers SET email='ranch.5941@example.vn', mobile_phone='0390246297', cccd='046231230085', date_of_birth=DATE '1984-11-03', tax_code='3416078231', personal_notes='LH 0390246297; CCCD 046231230085. Don hang cu #224326936335 da giao. Email backup: ranch.5941@example.vn', phone='0390246297' WHERE customer_id='RANCH';
UPDATE customers SET email='rattc.7627@example.vn', mobile_phone='0910119187', cccd='038267220285', date_of_birth=DATE '1966-07-25', tax_code='2474181085', personal_notes='LH 0910119187; CCCD 038267220285. Don hang cu #927240055424 da giao. Email backup: rattc.7627@example.vn', phone='0910119187' WHERE customer_id='RATTC';
UPDATE customers SET email='reggc.5750@example.vn', mobile_phone='0370031510', cccd='033214405055', date_of_birth=DATE '1982-08-26', tax_code='9696124937', personal_notes='LH 0370031510; CCCD 033214405055. Don hang cu #142603222105 da giao. Email backup: reggc.5750@example.vn', phone='0370031510' WHERE customer_id='REGGC';
UPDATE customers SET email='ricar.5028@example.vn', mobile_phone='0972045017', cccd='001228014805', date_of_birth=DATE '1975-12-10', tax_code='1742137882', personal_notes='LH 0972045017; CCCD 001228014805. Don hang cu #379528110175 da giao. Email backup: ricar.5028@example.vn', phone='0972045017' WHERE customer_id='RICAR';
UPDATE customers SET email='ricsu.6707@example.vn', mobile_phone='0325481390', cccd='033218265124', date_of_birth=DATE '1992-11-14', tax_code='1923304871', personal_notes='LH 0325481390; CCCD 033218265124. Don hang cu #474111260425 da giao. Email backup: ricsu.6707@example.vn', phone='0325481390' WHERE customer_id='RICSU';
UPDATE customers SET email='romey.4038@example.vn', mobile_phone='0354364343', cccd='001250825071', date_of_birth=DATE '1965-11-26', tax_code='3375172863', personal_notes='LH 0354364343; CCCD 001250825071. Don hang cu #802285041284 da giao. Email backup: romey.4038@example.vn', phone='0354364343' WHERE customer_id='ROMEY';
UPDATE customers SET email='santg.2850@example.vn', mobile_phone='0380505875', cccd='040250435835', date_of_birth=DATE '1988-05-19', tax_code='8241919705', personal_notes='LH 0380505875; CCCD 040250435835. Don hang cu #555529140041 da giao. Email backup: santg.2850@example.vn', phone='0380505875' WHERE customer_id='SANTG';
UPDATE customers SET email='savea.3538@example.vn', mobile_phone='0975271573', cccd='056225432578', date_of_birth=DATE '1960-02-05', tax_code='4250191933', personal_notes='LH 0975271573; CCCD 056225432578. Don hang cu #249004823426 da giao. Email backup: savea.3538@example.vn', phone='0975271573' WHERE customer_id='SAVEA';
UPDATE customers SET email='seves.6092@example.vn', mobile_phone='0908875672', cccd='001235806974', date_of_birth=DATE '1985-05-11', tax_code='5101245912', personal_notes='LH 0908875672; CCCD 001235806974. Don hang cu #548770505200 da giao. Email backup: seves.6092@example.vn', phone='0908875672' WHERE customer_id='SEVES';
UPDATE customers SET email='simob.2914@example.vn', mobile_phone='0392306393', cccd='046222239335', date_of_birth=DATE '1989-07-18', tax_code='2662943153', personal_notes='LH 0392306393; CCCD 046222239335. Don hang cu #865334437534 da giao. Email backup: simob.2914@example.vn', phone='0392306393' WHERE customer_id='SIMOB';
UPDATE customers SET email='specd.9394@example.vn', mobile_phone='0944027252', cccd='048231573405', date_of_birth=DATE '1983-03-21', tax_code='3357795901', personal_notes='LH 0944027252; CCCD 048231573405. Don hang cu #011033205195 da giao. Email backup: specd.9394@example.vn', phone='0944027252' WHERE customer_id='SPECD';
UPDATE customers SET email='splir.9455@example.vn', mobile_phone='0965199430', cccd='092215108411', date_of_birth=DATE '1984-04-04', tax_code='1214243203', personal_notes='LH 0965199430; CCCD 092215108411. Don hang cu #464720375787 da giao. Email backup: splir.9455@example.vn', phone='0965199430' WHERE customer_id='SPLIR';
UPDATE customers SET email='suprd.5222@example.vn', mobile_phone='0325000503', cccd='031211045211', date_of_birth=DATE '1977-03-10', tax_code='0054413201', personal_notes='LH 0325000503; CCCD 031211045211. Don hang cu #567130109705 da giao. Email backup: suprd.5222@example.vn', phone='0325000503' WHERE customer_id='SUPRD';
UPDATE customers SET email='thebi.0252@example.vn', mobile_phone='0931370524', cccd='031257742610', date_of_birth=DATE '1962-01-18', tax_code='2961388605', personal_notes='LH 0931370524; CCCD 031257742610. Don hang cu #573100406562 da giao. Email backup: thebi.0252@example.vn', phone='0931370524' WHERE customer_id='THEBI';
UPDATE customers SET email='thecr.0044@example.vn', mobile_phone='0901940995', cccd='001232730093', date_of_birth=DATE '1960-02-15', tax_code='4211498758', personal_notes='LH 0901940995; CCCD 001232730093. Don hang cu #721819733396 da giao. Email backup: thecr.0044@example.vn', phone='0901940995' WHERE customer_id='THECR';
UPDATE customers SET email='tomsp.3022@example.vn', mobile_phone='0902236681', cccd='001255907270', date_of_birth=DATE '1990-10-11', tax_code='5358271140', personal_notes='LH 0902236681; CCCD 001255907270. Don hang cu #426570655801 da giao. Email backup: tomsp.3022@example.vn', phone='0902236681' WHERE customer_id='TOMSP';
UPDATE customers SET email='tortu.1064@example.vn', mobile_phone='0357033775', cccd='001225021047', date_of_birth=DATE '1970-06-15', tax_code='1146313374', personal_notes='LH 0357033775; CCCD 001225021047. Don hang cu #127458792180 da giao. Email backup: tortu.1064@example.vn', phone='0357033775' WHERE customer_id='TORTU';
UPDATE customers SET email='tradh.4225@example.vn', mobile_phone='0378061413', cccd='031245431471', date_of_birth=DATE '1967-06-13', tax_code='2945933923', personal_notes='LH 0378061413; CCCD 031245431471. Don hang cu #116331301840 da giao. Email backup: tradh.4225@example.vn', phone='0378061413' WHERE customer_id='TRADH';
UPDATE customers SET email='traih.4345@example.vn', mobile_phone='0384591011', cccd='048225134053', date_of_birth=DATE '1968-06-05', tax_code='3592410613', personal_notes='LH 0384591011; CCCD 048225134053. Don hang cu #878206965880 da giao. Email backup: traih.4345@example.vn', phone='0384591011' WHERE customer_id='TRAIH';
UPDATE customers SET email='vaffe.9453@example.vn', mobile_phone='0963420049', cccd='092260122246', date_of_birth=DATE '1984-10-13', tax_code='0675054121', personal_notes='LH 0963420049; CCCD 092260122246. Don hang cu #427626677534 da giao. Email backup: vaffe.9453@example.vn', phone='0963420049' WHERE customer_id='VAFFE';
UPDATE customers SET email='victe.7396@example.vn', mobile_phone='0386373532', cccd='048242705055', date_of_birth=DATE '1963-11-11', tax_code='6901201376', personal_notes='LH 0386373532; CCCD 048242705055. Don hang cu #770497474855 da giao. Email backup: victe.7396@example.vn', phone='0386373532' WHERE customer_id='VICTE';
UPDATE customers SET email='vinet.2604@example.vn', mobile_phone='0365845738', cccd='038263451360', date_of_birth=DATE '1986-08-14', tax_code='2283936352', personal_notes='LH 0365845738; CCCD 038263451360. Don hang cu #456004352431 da giao. Email backup: vinet.2604@example.vn', phone='0365845738' WHERE customer_id='VINET';
UPDATE customers SET email='wandk.5154@example.vn', mobile_phone='0982671193', cccd='079211269325', date_of_birth=DATE '1976-03-22', tax_code='5526511806', personal_notes='LH 0982671193; CCCD 079211269325. Don hang cu #158139322434 da giao. Email backup: wandk.5154@example.vn', phone='0982671193' WHERE customer_id='WANDK';
UPDATE customers SET email='warth.1571@example.vn', mobile_phone='0905041766', cccd='056230409914', date_of_birth=DATE '1975-04-05', tax_code='1371951242', personal_notes='LH 0905041766; CCCD 056230409914. Don hang cu #021236521786 da giao. Email backup: warth.1571@example.vn', phone='0905041766' WHERE customer_id='WARTH';
UPDATE customers SET email='welli.1213@example.vn', mobile_phone='0375142504', cccd='031226650249', date_of_birth=DATE '1972-09-27', tax_code='4351145236', personal_notes='LH 0375142504; CCCD 031226650249. Don hang cu #277422283311 da giao. Email backup: welli.1213@example.vn', phone='0375142504' WHERE customer_id='WELLI';
UPDATE customers SET email='whitc.3376@example.vn', mobile_phone='0942247253', cccd='048231011831', date_of_birth=DATE '1993-11-07', tax_code='1602400536', personal_notes='LH 0942247253; CCCD 048231011831. Don hang cu #459882411041 da giao. Email backup: whitc.3376@example.vn', phone='0942247253' WHERE customer_id='WHITC';
UPDATE customers SET email='wilmk.4701@example.vn', mobile_phone='0933073545', cccd='033260203083', date_of_birth=DATE '1972-08-25', tax_code='0145126533', personal_notes='LH 0933073545; CCCD 033260203083. Don hang cu #923350865084 da giao. Email backup: wilmk.4701@example.vn', phone='0933073545' WHERE customer_id='WILMK';
UPDATE customers SET email='wolza.4456@example.vn', mobile_phone='0398999120', cccd='092210212206', date_of_birth=DATE '1969-02-23', tax_code='1398319207', personal_notes='LH 0398999120; CCCD 092210212206. Don hang cu #942209180864 da giao. Email backup: wolza.4456@example.vn', phone='0398999120' WHERE customer_id='WOLZA';

UPDATE customers SET c1 = mobile_phone, c2 = cccd;

-- ----- Enrich employees -----
UPDATE employees SET personal_email='nancy.3633@example.vn', cccd='038362218063', mobile_phone='0987170449', tax_code='5607603774', home_phone='0987170449', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0987170449 / nancy.3633@example.vn; CCCD 038362218063.' WHERE employee_id=1;
UPDATE employees SET personal_email='andrew.8097@example.vn', cccd='001345814212', mobile_phone='0979411943', tax_code='9730260335', home_phone='0979411943', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0979411943 / andrew.8097@example.vn; CCCD 001345814212.' WHERE employee_id=2;
UPDATE employees SET personal_email='janet.0493@example.vn', cccd='092334212348', mobile_phone='0965422452', tax_code='0604522429', home_phone='0965422452', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0965422452 / janet.0493@example.vn; CCCD 092334212348.' WHERE employee_id=3;
UPDATE employees SET personal_email='margaret.8436@example.vn', cccd='092320612908', mobile_phone='0341222402', tax_code='5490019288', home_phone='0341222402', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0341222402 / margaret.8436@example.vn; CCCD 092320612908.' WHERE employee_id=4;
UPDATE employees SET personal_email='steven.8054@example.vn', cccd='001358825143', mobile_phone='0973644130', tax_code='0281053121', home_phone='0973644130', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0973644130 / steven.8054@example.vn; CCCD 001358825143.' WHERE employee_id=5;
UPDATE employees SET personal_email='michael.6805@example.vn', cccd='040314413405', mobile_phone='0334942326', tax_code='0547632271', home_phone='0334942326', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0334942326 / michael.6805@example.vn; CCCD 040314413405.' WHERE employee_id=6;
UPDATE employees SET personal_email='robert.1300@example.vn', cccd='048333125739', mobile_phone='0387018001', tax_code='2354500371', home_phone='0387018001', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0387018001 / robert.1300@example.vn; CCCD 048333125739.' WHERE employee_id=7;
UPDATE employees SET personal_email='laura.0319@example.vn', cccd='048354179091', mobile_phone='0947517261', tax_code='1475446525', home_phone='0947517261', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0947517261 / laura.0319@example.vn; CCCD 048354179091.' WHERE employee_id=8;
UPDATE employees SET personal_email='anne.2172@example.vn', cccd='079322293325', mobile_phone='0986555023', tax_code='4334554574', home_phone='0986555023', notes = COALESCE(notes, '') || ' Lien he ca nhan: 0986555023 / anne.2172@example.vn; CCCD 079322293325.' WHERE employee_id=9;

-- ----- Enrich suppliers -----
UPDATE suppliers SET contact_email='supplier.4140@example.vn', tax_code='3615543256', contact_cccd='079214832034' WHERE supplier_id=1;
UPDATE suppliers SET contact_email='supplier.0588@example.vn', tax_code='0854221552', contact_cccd='056232853201' WHERE supplier_id=2;
UPDATE suppliers SET contact_email='supplier.4555@example.vn', tax_code='8483750051', contact_cccd='056272480223' WHERE supplier_id=3;
UPDATE suppliers SET contact_email='supplier.9219@example.vn', tax_code='7092107073', contact_cccd='031236635720' WHERE supplier_id=4;
UPDATE suppliers SET contact_email='supplier.4734@example.vn', tax_code='0531845354', contact_cccd='033226243428' WHERE supplier_id=5;
UPDATE suppliers SET contact_email='supplier.1405@example.vn', tax_code='0092425543', contact_cccd='092223571505' WHERE supplier_id=6;
UPDATE suppliers SET contact_email='supplier.1045@example.vn', tax_code='4766491511', contact_cccd='001243453224' WHERE supplier_id=7;
UPDATE suppliers SET contact_email='supplier.3613@example.vn', tax_code='5152609545', contact_cccd='038241053558' WHERE supplier_id=8;
UPDATE suppliers SET contact_email='supplier.8343@example.vn', tax_code='8224543815', contact_cccd='048278710435' WHERE supplier_id=9;
UPDATE suppliers SET contact_email='supplier.7059@example.vn', tax_code='1471757175', contact_cccd='001236796448' WHERE supplier_id=10;
UPDATE suppliers SET contact_email='supplier.2747@example.vn', tax_code='2318323397', contact_cccd='033256133763' WHERE supplier_id=11;
UPDATE suppliers SET contact_email='supplier.4220@example.vn', tax_code='4229545819', contact_cccd='031215915030' WHERE supplier_id=12;
UPDATE suppliers SET contact_email='supplier.7142@example.vn', tax_code='5283040967', contact_cccd='079244122513' WHERE supplier_id=13;
UPDATE suppliers SET contact_email='supplier.2534@example.vn', tax_code='3764241200', contact_cccd='056220841513' WHERE supplier_id=14;
UPDATE suppliers SET contact_email='supplier.1060@example.vn', tax_code='3213851060', contact_cccd='001270362811' WHERE supplier_id=15;
UPDATE suppliers SET contact_email='supplier.3828@example.vn', tax_code='2178805034', contact_cccd='040243318599' WHERE supplier_id=16;
UPDATE suppliers SET contact_email='supplier.6804@example.vn', tax_code='3040054209', contact_cccd='040240356063' WHERE supplier_id=17;
UPDATE suppliers SET contact_email='supplier.6801@example.vn', tax_code='1841938145', contact_cccd='040249382638' WHERE supplier_id=18;
UPDATE suppliers SET contact_email='supplier.9154@example.vn', tax_code='9399125443', contact_cccd='079285513451' WHERE supplier_id=19;
UPDATE suppliers SET contact_email='supplier.0004@example.vn', tax_code='5374660622', contact_cccd='001244105284' WHERE supplier_id=20;
UPDATE suppliers SET contact_email='supplier.2263@example.vn', tax_code='9255361579', contact_cccd='031254044343' WHERE supplier_id=21;
UPDATE suppliers SET contact_email='supplier.0431@example.vn', tax_code='9098144333', contact_cccd='092210269111' WHERE supplier_id=22;
UPDATE suppliers SET contact_email='supplier.2714@example.vn', tax_code='5216271475', contact_cccd='033284616215' WHERE supplier_id=23;
UPDATE suppliers SET contact_email='supplier.0085@example.vn', tax_code='8927705113', contact_cccd='001218027370' WHERE supplier_id=24;
UPDATE suppliers SET contact_email='supplier.7221@example.vn', tax_code='4244054005', contact_cccd='031263094062' WHERE supplier_id=25;
UPDATE suppliers SET contact_email='supplier.1414@example.vn', tax_code='8475795338', contact_cccd='092275114557' WHERE supplier_id=26;
UPDATE suppliers SET contact_email='supplier.3202@example.vn', tax_code='3863213411', contact_cccd='031282826040' WHERE supplier_id=27;
UPDATE suppliers SET contact_email='supplier.3745@example.vn', tax_code='1801053782', contact_cccd='033283785860' WHERE supplier_id=28;
UPDATE suppliers SET contact_email='supplier.4041@example.vn', tax_code='2434822736', contact_cccd='001210334455' WHERE supplier_id=29;

-- ----- Enrich orders: denormalized CCCD join key + tracking FP + notes -----
UPDATE orders SET customer_cccd='038263451360', ship_phone='0980431050', tracking_code='400691172582', order_notes='Goi nguoi nhan 0980431050; xac minh CCCD 038263451360. Tracking 400691172582.' WHERE order_id=10248;
UPDATE orders SET customer_cccd='001255907270', ship_phone='0340045404', tracking_code='320610223362', order_notes='Tracking 320610223362' WHERE order_id=10249;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0359202855', tracking_code='129570333134', order_notes='Ma van don 129570333134 — khong phai CCCD.' WHERE order_id=10250;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0973945361', tracking_code='555213454514', order_notes='Tracking 555213454514' WHERE order_id=10251;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0903533472', tracking_code='363595014472', order_notes='Tracking 363595014472' WHERE order_id=10252;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0947821476', tracking_code='614485004531', order_notes='Tracking 614485004531' WHERE order_id=10253;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0971558221', tracking_code='494082074050', order_notes='Tracking 494082074050' WHERE order_id=10254;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0904824055', tracking_code='203954900083', order_notes='Goi nguoi nhan 0904824055; xac minh CCCD 033218265124. Tracking 203954900083.' WHERE order_id=10255;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0323205605', tracking_code='360553394112', order_notes='Tracking 360553394112' WHERE order_id=10256;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0907811041', tracking_code='573210419660', order_notes='Tracking 573210419660' WHERE order_id=10257;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0971031175', tracking_code='005019112257', order_notes='Tracking 005019112257' WHERE order_id=10258;
UPDATE orders SET customer_cccd='048230628024', ship_phone='0900231390', tracking_code='344673923922', order_notes='Tracking 344673923922' WHERE order_id=10259;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0975943052', tracking_code='365134502970', order_notes='Ma van don 365134502970 — khong phai CCCD.' WHERE order_id=10260;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0902993118', tracking_code='435841128305', order_notes='Tracking 435841128305' WHERE order_id=10261;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0936045493', tracking_code='358146221362', order_notes='Goi nguoi nhan 0936045493; xac minh CCCD 038267220285. Tracking 358146221362.' WHERE order_id=10262;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0324025827', tracking_code='712834233030', order_notes='Tracking 712834233030' WHERE order_id=10263;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0933231142', tracking_code='558359311318', order_notes='Tracking 558359311318' WHERE order_id=10264;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0915137513', tracking_code='705620443852', order_notes='Ma van don 705620443852 — khong phai CCCD.' WHERE order_id=10265;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0938335933', tracking_code='330623344651', order_notes='Tracking 330623344651' WHERE order_id=10266;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0374354476', tracking_code='200272739454', order_notes='Tracking 200272739454' WHERE order_id=10267;
UPDATE orders SET customer_cccd='031234758892', ship_phone='0362342754', tracking_code='638215332317', order_notes='Tracking 638215332317' WHERE order_id=10268;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0370648588', tracking_code='141115506831', order_notes='Goi nguoi nhan 0370648588; xac minh CCCD 048231011831. Tracking 141115506831.' WHERE order_id=10269;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0905832993', tracking_code='330010591212', order_notes='Ma van don 330010591212 — khong phai CCCD.' WHERE order_id=10270;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0325553724', tracking_code='227413041140', order_notes='Tracking 227413041140' WHERE order_id=10271;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0909514234', tracking_code='945834724904', order_notes='Tracking 945834724904' WHERE order_id=10272;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0975201133', tracking_code='534924102931', order_notes='Tracking 534924102931' WHERE order_id=10273;
UPDATE orders SET customer_cccd='038263451360', ship_phone='0967901637', tracking_code='035286733450', order_notes='Tracking 035286733450' WHERE order_id=10274;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0330044924', tracking_code='445531259200', order_notes='Ma van don 445531259200 — khong phai CCCD.' WHERE order_id=10275;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0975705524', tracking_code='744353504688', order_notes='Goi nguoi nhan 0975705524; xac minh CCCD 001225021047. Tracking 744353504688.' WHERE order_id=10276;
UPDATE orders SET customer_cccd='031261827644', ship_phone='0333381123', tracking_code='545429353020', order_notes='Tracking 545429353020' WHERE order_id=10277;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0396405264', tracking_code='488249770990', order_notes='Tracking 488249770990' WHERE order_id=10278;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0325986114', tracking_code='154454534543', order_notes='Tracking 154454534543' WHERE order_id=10279;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0377962124', tracking_code='528903212131', order_notes='Ma van don 528903212131 — khong phai CCCD.' WHERE order_id=10280;
UPDATE orders SET customer_cccd='001250825071', ship_phone='0933260751', tracking_code='064624722649', order_notes='Tracking 064624722649' WHERE order_id=10281;
UPDATE orders SET customer_cccd='001250825071', ship_phone='0915488082', tracking_code='152332798033', order_notes='Tracking 152332798033' WHERE order_id=10282;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0393028904', tracking_code='575344521435', order_notes='Goi nguoi nhan 0393028904; xac minh CCCD 092261351332. Tracking 575344521435.' WHERE order_id=10283;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0970122046', tracking_code='644715581448', order_notes='Tracking 644715581448' WHERE order_id=10284;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0392450110', tracking_code='267330204861', order_notes='Ma van don 267330204861 — khong phai CCCD.' WHERE order_id=10285;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0392612810', tracking_code='379362449453', order_notes='Tracking 379362449453' WHERE order_id=10286;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0394440225', tracking_code='172223002134', order_notes='Tracking 172223002134' WHERE order_id=10287;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0919197373', tracking_code='492944574294', order_notes='Tracking 492944574294' WHERE order_id=10288;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0919118218', tracking_code='446356142043', order_notes='Tracking 446356142043' WHERE order_id=10289;
UPDATE orders SET customer_cccd='048261171560', ship_phone='0940442325', tracking_code='080432145689', order_notes='Goi nguoi nhan 0940442325; xac minh CCCD 048261171560. Tracking 080432145689.' WHERE order_id=10290;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0385781940', tracking_code='524934301924', order_notes='Tracking 524934301924' WHERE order_id=10291;
UPDATE orders SET customer_cccd='031245431471', ship_phone='0352949461', tracking_code='030451400300', order_notes='Tracking 030451400300' WHERE order_id=10292;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0379365405', tracking_code='404758420501', order_notes='Tracking 404758420501' WHERE order_id=10293;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0352355751', tracking_code='720080461190', order_notes='Tracking 720080461190' WHERE order_id=10294;
UPDATE orders SET customer_cccd='038263451360', ship_phone='0973720251', tracking_code='157642392415', order_notes='Ma van don 157642392415 — khong phai CCCD.' WHERE order_id=10295;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0321325120', tracking_code='944410707537', order_notes='Tracking 944410707537' WHERE order_id=10296;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0328420330', tracking_code='422202100075', order_notes='Goi nguoi nhan 0328420330; xac minh CCCD 046234423770. Tracking 422202100075.' WHERE order_id=10297;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0904022171', tracking_code='324511554930', order_notes='Tracking 324511554930' WHERE order_id=10298;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0345051114', tracking_code='194421582476', order_notes='Tracking 194421582476' WHERE order_id=10299;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0387726100', tracking_code='804835384754', order_notes='Ma van don 804835384754 — khong phai CCCD.' WHERE order_id=10300;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0384421230', tracking_code='714215392064', order_notes='Tracking 714215392064' WHERE order_id=10301;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0905523356', tracking_code='353321035462', order_notes='Tracking 353321035462' WHERE order_id=10302;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0975848291', tracking_code='620138254714', order_notes='Tracking 620138254714' WHERE order_id=10303;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0964955065', tracking_code='317457341166', order_notes='Goi nguoi nhan 0964955065; xac minh CCCD 001225021047. Tracking 317457341166.' WHERE order_id=10304;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0394364452', tracking_code='364543114582', order_notes='Ma van don 364543114582 — khong phai CCCD.' WHERE order_id=10305;
UPDATE orders SET customer_cccd='001250825071', ship_phone='0941460694', tracking_code='232342575005', order_notes='Tracking 232342575005' WHERE order_id=10306;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0905232820', tracking_code='000877852514', order_notes='Tracking 000877852514' WHERE order_id=10307;
UPDATE orders SET customer_cccd='040280283936', ship_phone='0975080047', tracking_code='738505495105', order_notes='Tracking 738505495105' WHERE order_id=10308;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0964524823', tracking_code='965451175747', order_notes='Tracking 965451175747' WHERE order_id=10309;
UPDATE orders SET customer_cccd='031257742610', ship_phone='0364804109', tracking_code='591586150452', order_notes='Ma van don 591586150452 — khong phai CCCD.' WHERE order_id=10310;
UPDATE orders SET customer_cccd='031267344633', ship_phone='0327803923', tracking_code='022418047110', order_notes='Goi nguoi nhan 0327803923; xac minh CCCD 031267344633. Tracking 022418047110.' WHERE order_id=10311;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0974684172', tracking_code='248206455913', order_notes='Tracking 248206455913' WHERE order_id=10312;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0326011250', tracking_code='414516011182', order_notes='Tracking 414516011182' WHERE order_id=10313;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0380528616', tracking_code='366557571130', order_notes='Tracking 366557571130' WHERE order_id=10314;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0965019127', tracking_code='150510144456', order_notes='Ma van don 150510144456 — khong phai CCCD.' WHERE order_id=10315;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0904122642', tracking_code='455577188584', order_notes='Tracking 455577188584' WHERE order_id=10316;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0384613944', tracking_code='022429236224', order_notes='Tracking 022429236224' WHERE order_id=10317;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0966329565', tracking_code='155642528081', order_notes='Goi nguoi nhan 0966329565; xac minh CCCD 056236234103. Tracking 155642528081.' WHERE order_id=10318;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0937094246', tracking_code='557714029818', order_notes='Tracking 557714029818' WHERE order_id=10319;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0918870548', tracking_code='155175228506', order_notes='Ma van don 155175228506 — khong phai CCCD.' WHERE order_id=10320;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0321195795', tracking_code='512104182222', order_notes='Tracking 512104182222' WHERE order_id=10321;
UPDATE orders SET customer_cccd='031252613701', ship_phone='0918481922', tracking_code='921954511425', order_notes='Tracking 921954511425' WHERE order_id=10322;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0939207901', tracking_code='360439351455', order_notes='Tracking 360439351455' WHERE order_id=10323;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0983544035', tracking_code='004075401175', order_notes='Tracking 004075401175' WHERE order_id=10324;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0944701253', tracking_code='650851166784', order_notes='Goi nguoi nhan 0944701253; xac minh CCCD 056265265304. Tracking 650851166784.' WHERE order_id=10325;
UPDATE orders SET customer_cccd='079261880141', ship_phone='0919798442', tracking_code='285824324932', order_notes='Tracking 285824324932' WHERE order_id=10326;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0352389172', tracking_code='145140873341', order_notes='Tracking 145140873341' WHERE order_id=10327;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0910431393', tracking_code='127633954081', order_notes='Tracking 127633954081' WHERE order_id=10328;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0359323042', tracking_code='261241396101', order_notes='Tracking 261241396101' WHERE order_id=10329;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0393611347', tracking_code='521180453041', order_notes='Ma van don 521180453041 — khong phai CCCD.' WHERE order_id=10330;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0392823360', tracking_code='870602415911', order_notes='Tracking 870602415911' WHERE order_id=10331;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0937523605', tracking_code='261087340412', order_notes='Goi nguoi nhan 0937523605; xac minh CCCD 033223595251. Tracking 261087340412.' WHERE order_id=10332;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0353661565', tracking_code='600160235132', order_notes='Tracking 600160235132' WHERE order_id=10333;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0391322156', tracking_code='653594320607', order_notes='Tracking 653594320607' WHERE order_id=10334;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0977445257', tracking_code='261812782638', order_notes='Ma van don 261812782638 — khong phai CCCD.' WHERE order_id=10335;
UPDATE orders SET customer_cccd='033250235555', ship_phone='0383841339', tracking_code='212511425253', order_notes='Tracking 212511425253' WHERE order_id=10336;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0342223514', tracking_code='238022340495', order_notes='Tracking 238022340495' WHERE order_id=10337;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0968984021', tracking_code='046451982722', order_notes='Tracking 046451982722' WHERE order_id=10338;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0370101766', tracking_code='128384035323', order_notes='Goi nguoi nhan 0370101766; xac minh CCCD 033223595251. Tracking 128384035323.' WHERE order_id=10339;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0984521560', tracking_code='244320058245', order_notes='Ma van don 244320058245 — khong phai CCCD.' WHERE order_id=10340;
UPDATE orders SET customer_cccd='046222239335', ship_phone='0351015943', tracking_code='604281932511', order_notes='Tracking 604281932511' WHERE order_id=10341;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0985215350', tracking_code='204009980010', order_notes='Tracking 204009980010' WHERE order_id=10342;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0355535215', tracking_code='535822951265', order_notes='Tracking 535822951265' WHERE order_id=10343;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0932009436', tracking_code='695404911153', order_notes='Tracking 695404911153' WHERE order_id=10344;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0934353741', tracking_code='590045375430', order_notes='Ma van don 590045375430 — khong phai CCCD.' WHERE order_id=10345;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0941110483', tracking_code='131820204635', order_notes='Goi nguoi nhan 0941110483; xac minh CCCD 038267220285. Tracking 131820204635.' WHERE order_id=10346;
UPDATE orders SET customer_cccd='092241961807', ship_phone='0961460603', tracking_code='362725103514', order_notes='Tracking 362725103514' WHERE order_id=10347;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0393361183', tracking_code='848243205149', order_notes='Tracking 848243205149' WHERE order_id=10348;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0350502170', tracking_code='550117849412', order_notes='Tracking 550117849412' WHERE order_id=10349;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0963535605', tracking_code='476836100204', order_notes='Ma van don 476836100204 — khong phai CCCD.' WHERE order_id=10350;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0980628984', tracking_code='618225950146', order_notes='Tracking 618225950146' WHERE order_id=10351;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0385028586', tracking_code='193315350453', order_notes='Tracking 193315350453' WHERE order_id=10352;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0985749755', tracking_code='201564437057', order_notes='Goi nguoi nhan 0985749755; xac minh CCCD 092239621798. Tracking 201564437057.' WHERE order_id=10353;
UPDATE orders SET customer_cccd='031252613701', ship_phone='0911102032', tracking_code='899086313714', order_notes='Tracking 899086313714' WHERE order_id=10354;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0971749013', tracking_code='254623800927', order_notes='Ma van don 254623800927 — khong phai CCCD.' WHERE order_id=10355;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0903636201', tracking_code='011961211465', order_notes='Tracking 011961211465' WHERE order_id=10356;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0354053215', tracking_code='218869346254', order_notes='Tracking 218869346254' WHERE order_id=10357;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0972221439', tracking_code='881805862323', order_notes='Tracking 881805862323' WHERE order_id=10358;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0945425332', tracking_code='891105452848', order_notes='Tracking 891105452848' WHERE order_id=10359;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0344313262', tracking_code='121311362374', order_notes='Goi nguoi nhan 0344313262; xac minh CCCD 046234423770. Tracking 121311362374.' WHERE order_id=10360;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0901222355', tracking_code='422945334960', order_notes='Tracking 422945334960' WHERE order_id=10361;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0934927011', tracking_code='592125701752', order_notes='Tracking 592125701752' WHERE order_id=10362;
UPDATE orders SET customer_cccd='056271744241', ship_phone='0385392983', tracking_code='204337577576', order_notes='Tracking 204337577576' WHERE order_id=10363;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0918098871', tracking_code='255224032195', order_notes='Tracking 255224032195' WHERE order_id=10364;
UPDATE orders SET customer_cccd='048221541620', ship_phone='0351320452', tracking_code='948025219721', order_notes='Ma van don 948025219721 — khong phai CCCD.' WHERE order_id=10365;
UPDATE orders SET customer_cccd='031227576727', ship_phone='0970444215', tracking_code='828030734156', order_notes='Tracking 828030734156' WHERE order_id=10366;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0974551256', tracking_code='412033024963', order_notes='Goi nguoi nhan 0974551256; xac minh CCCD 092260122246. Tracking 412033024963.' WHERE order_id=10367;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0395022951', tracking_code='384951613715', order_notes='Tracking 384951613715' WHERE order_id=10368;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0961246502', tracking_code='101315311924', order_notes='Tracking 101315311924' WHERE order_id=10369;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0909308045', tracking_code='514632548901', order_notes='Ma van don 514632548901 — khong phai CCCD.' WHERE order_id=10370;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0367775210', tracking_code='320036314031', order_notes='Tracking 320036314031' WHERE order_id=10371;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0945433667', tracking_code='246341484638', order_notes='Tracking 246341484638' WHERE order_id=10372;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0325178315', tracking_code='372323517034', order_notes='Tracking 372323517034' WHERE order_id=10373;
UPDATE orders SET customer_cccd='092210212206', ship_phone='0337514501', tracking_code='634256942060', order_notes='Goi nguoi nhan 0337514501; xac minh CCCD 092210212206. Tracking 634256942060.' WHERE order_id=10374;
UPDATE orders SET customer_cccd='092210431243', ship_phone='0389359185', tracking_code='356523113603', order_notes='Ma van don 356523113603 — khong phai CCCD.' WHERE order_id=10375;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0371002554', tracking_code='210549104503', order_notes='Tracking 210549104503' WHERE order_id=10376;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0379051202', tracking_code='325445124423', order_notes='Tracking 325445124423' WHERE order_id=10377;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0343428693', tracking_code='421315335033', order_notes='Tracking 421315335033' WHERE order_id=10378;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0346335413', tracking_code='729707370766', order_notes='Tracking 729707370766' WHERE order_id=10379;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0323002733', tracking_code='665545363243', order_notes='Ma van don 665545363243 — khong phai CCCD.' WHERE order_id=10380;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0974708637', tracking_code='391411025449', order_notes='Goi nguoi nhan 0974708637; xac minh CCCD 092261351332. Tracking 391411025449.' WHERE order_id=10381;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0396642104', tracking_code='206095662532', order_notes='Tracking 206095662532' WHERE order_id=10382;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0970854719', tracking_code='525151024243', order_notes='Tracking 525151024243' WHERE order_id=10383;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0360169821', tracking_code='302050092527', order_notes='Tracking 302050092527' WHERE order_id=10384;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0917057127', tracking_code='183822660051', order_notes='Ma van don 183822660051 — khong phai CCCD.' WHERE order_id=10385;
UPDATE orders SET customer_cccd='092241961807', ship_phone='0976351335', tracking_code='377611363529', order_notes='Tracking 377611363529' WHERE order_id=10386;
UPDATE orders SET customer_cccd='040250435835', ship_phone='0360812542', tracking_code='045092449386', order_notes='Tracking 045092449386' WHERE order_id=10387;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0980519147', tracking_code='413076119006', order_notes='Goi nguoi nhan 0980519147; xac minh CCCD 001235806974. Tracking 413076119006.' WHERE order_id=10388;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0965411093', tracking_code='320332573142', order_notes='Tracking 320332573142' WHERE order_id=10389;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0373013240', tracking_code='754027150493', order_notes='Ma van don 754027150493 — khong phai CCCD.' WHERE order_id=10390;
UPDATE orders SET customer_cccd='056271744241', ship_phone='0337590212', tracking_code='231331547008', order_notes='Tracking 231331547008' WHERE order_id=10391;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0363463352', tracking_code='524300917159', order_notes='Tracking 524300917159' WHERE order_id=10392;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0353003231', tracking_code='602915245113', order_notes='Tracking 602915245113' WHERE order_id=10393;
UPDATE orders SET customer_cccd='092210431243', ship_phone='0339877675', tracking_code='424245036354', order_notes='Tracking 424245036354' WHERE order_id=10394;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0904956884', tracking_code='312649922894', order_notes='Goi nguoi nhan 0904956884; xac minh CCCD 079213257230. Tracking 312649922894.' WHERE order_id=10395;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0900349775', tracking_code='844474934407', order_notes='Tracking 844474934407' WHERE order_id=10396;
UPDATE orders SET customer_cccd='033250235555', ship_phone='0941030894', tracking_code='197811336075', order_notes='Tracking 197811336075' WHERE order_id=10397;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0371880412', tracking_code='055494677072', order_notes='Tracking 055494677072' WHERE order_id=10398;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0332815166', tracking_code='584415438212', order_notes='Tracking 584415438212' WHERE order_id=10399;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0930811539', tracking_code='301415337012', order_notes='Ma van don 301415337012 — khong phai CCCD.' WHERE order_id=10400;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0354502225', tracking_code='452525051137', order_notes='Tracking 452525051137' WHERE order_id=10401;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0354693940', tracking_code='026336026223', order_notes='Goi nguoi nhan 0354693940; xac minh CCCD 031254533090. Tracking 026336026223.' WHERE order_id=10402;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0975118237', tracking_code='236294421246', order_notes='Tracking 236294421246' WHERE order_id=10403;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0374404538', tracking_code='546482313540', order_notes='Tracking 546482313540' WHERE order_id=10404;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0942913244', tracking_code='089552233760', order_notes='Ma van don 089552233760 — khong phai CCCD.' WHERE order_id=10405;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0909050183', tracking_code='522315009470', order_notes='Tracking 522315009470' WHERE order_id=10406;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0945641257', tracking_code='057940240802', order_notes='Tracking 057940240802' WHERE order_id=10407;
UPDATE orders SET customer_cccd='031249679568', ship_phone='0975260579', tracking_code='284204510024', order_notes='Tracking 284204510024' WHERE order_id=10408;
UPDATE orders SET customer_cccd='040215439252', ship_phone='0964983405', tracking_code='893640500547', order_notes='Goi nguoi nhan 0964983405; xac minh CCCD 040215439252. Tracking 893640500547.' WHERE order_id=10409;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0352521041', tracking_code='851302201393', order_notes='Ma van don 851302201393 — khong phai CCCD.' WHERE order_id=10410;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0395424733', tracking_code='817297176220', order_notes='Tracking 817297176220' WHERE order_id=10411;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0355287411', tracking_code='493448615312', order_notes='Tracking 493448615312' WHERE order_id=10412;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0944456465', tracking_code='043014537495', order_notes='Tracking 043014537495' WHERE order_id=10413;
UPDATE orders SET customer_cccd='092241961807', ship_phone='0336742975', tracking_code='454244397173', order_notes='Tracking 454244397173' WHERE order_id=10414;
UPDATE orders SET customer_cccd='092210431243', ship_phone='0947811380', tracking_code='501402258303', order_notes='Ma van don 501402258303 — khong phai CCCD.' WHERE order_id=10415;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0912338751', tracking_code='235962315534', order_notes='Goi nguoi nhan 0912338751; xac minh CCCD 056230409914. Tracking 235962315534.' WHERE order_id=10416;
UPDATE orders SET customer_cccd='046222239335', ship_phone='0347032452', tracking_code='091615319825', order_notes='Tracking 091615319825' WHERE order_id=10417;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0359050210', tracking_code='342548410450', order_notes='Tracking 342548410450' WHERE order_id=10418;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0917823370', tracking_code='224178179024', order_notes='Tracking 224178179024' WHERE order_id=10419;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0377023777', tracking_code='239238359202', order_notes='Ma van don 239238359202 — khong phai CCCD.' WHERE order_id=10420;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0341581708', tracking_code='425116412323', order_notes='Tracking 425116412323' WHERE order_id=10421;
UPDATE orders SET customer_cccd='031225011357', ship_phone='0905421385', tracking_code='402237835612', order_notes='Tracking 402237835612' WHERE order_id=10422;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0980391613', tracking_code='202132707056', order_notes='Goi nguoi nhan 0980391613; xac minh CCCD 031284043040. Tracking 202132707056.' WHERE order_id=10423;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0390471627', tracking_code='534803250243', order_notes='Tracking 534803250243' WHERE order_id=10424;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0972131773', tracking_code='415985515515', order_notes='Ma van don 415985515515 — khong phai CCCD.' WHERE order_id=10425;
UPDATE orders SET customer_cccd='031227576727', ship_phone='0346016573', tracking_code='521336052221', order_notes='Tracking 521336052221' WHERE order_id=10426;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0345342513', tracking_code='342729347213', order_notes='Tracking 342729347213' WHERE order_id=10427;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0983394516', tracking_code='051115612017', order_notes='Tracking 051115612017' WHERE order_id=10428;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0979810422', tracking_code='974231933605', order_notes='Tracking 974231933605' WHERE order_id=10429;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0964747320', tracking_code='934366382177', order_notes='Goi nguoi nhan 0964747320; xac minh CCCD 031254533090. Tracking 934366382177.' WHERE order_id=10430;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0966263835', tracking_code='969543011398', order_notes='Tracking 969543011398' WHERE order_id=10431;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0911455127', tracking_code='785055081573', order_notes='Tracking 785055081573' WHERE order_id=10432;
UPDATE orders SET customer_cccd='033250235555', ship_phone='0336034568', tracking_code='586110213164', order_notes='Tracking 586110213164' WHERE order_id=10433;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0914555640', tracking_code='231040522235', order_notes='Tracking 231040522235' WHERE order_id=10434;
UPDATE orders SET customer_cccd='001229650685', ship_phone='0973528000', tracking_code='801150318541', order_notes='Ma van don 801150318541 — khong phai CCCD.' WHERE order_id=10435;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0353224011', tracking_code='864300904077', order_notes='Tracking 864300904077' WHERE order_id=10436;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0943802433', tracking_code='665657213896', order_notes='Goi nguoi nhan 0943802433; xac minh CCCD 056230409914. Tracking 665657213896.' WHERE order_id=10437;
UPDATE orders SET customer_cccd='001255907270', ship_phone='0390819422', tracking_code='162378418269', order_notes='Tracking 162378418269' WHERE order_id=10438;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0363324513', tracking_code='530453411121', order_notes='Tracking 530453411121' WHERE order_id=10439;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0331820113', tracking_code='380898004931', order_notes='Ma van don 380898004931 — khong phai CCCD.' WHERE order_id=10440;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0324254046', tracking_code='006139223218', order_notes='Tracking 006139223218' WHERE order_id=10441;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0354780225', tracking_code='235081494315', order_notes='Tracking 235081494315' WHERE order_id=10442;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0935234282', tracking_code='791635457062', order_notes='Tracking 791635457062' WHERE order_id=10443;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0380423414', tracking_code='714410340333', order_notes='Goi nguoi nhan 0380423414; xac minh CCCD 079265505644. Tracking 714410340333.' WHERE order_id=10444;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0371191078', tracking_code='466301274536', order_notes='Ma van don 466301274536 — khong phai CCCD.' WHERE order_id=10445;
UPDATE orders SET customer_cccd='001255907270', ship_phone='0383015440', tracking_code='315388103514', order_notes='Tracking 315388103514' WHERE order_id=10446;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0909810863', tracking_code='781712004517', order_notes='Tracking 781712004517' WHERE order_id=10447;
UPDATE orders SET customer_cccd='046231230085', ship_phone='0362559465', tracking_code='551444201492', order_notes='Tracking 551444201492' WHERE order_id=10448;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0911085025', tracking_code='419055432913', order_notes='Tracking 419055432913' WHERE order_id=10449;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0364390515', tracking_code='240743487643', order_notes='Ma van don 240743487643 — khong phai CCCD.' WHERE order_id=10450;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0325924694', tracking_code='124721235303', order_notes='Goi nguoi nhan 0325924694; xac minh CCCD 001261085930. Tracking 124721235303.' WHERE order_id=10451;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0391328115', tracking_code='009226086751', order_notes='Tracking 009226086751' WHERE order_id=10452;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0365016339', tracking_code='409324554145', order_notes='Tracking 409324554145' WHERE order_id=10453;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0356145060', tracking_code='081114357044', order_notes='Tracking 081114357044' WHERE order_id=10454;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0919004412', tracking_code='989541572303', order_notes='Ma van don 989541572303 — khong phai CCCD.' WHERE order_id=10455;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0900402275', tracking_code='535820016653', order_notes='Tracking 535820016653' WHERE order_id=10456;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0940580277', tracking_code='254814226011', order_notes='Tracking 254814226011' WHERE order_id=10457;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0325011452', tracking_code='984420201308', order_notes='Goi nguoi nhan 0325011452; xac minh CCCD 031211045211. Tracking 984420201308.' WHERE order_id=10458;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0904193146', tracking_code='651582450821', order_notes='Tracking 651582450821' WHERE order_id=10459;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0345447193', tracking_code='353002281099', order_notes='Ma van don 353002281099 — khong phai CCCD.' WHERE order_id=10460;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0363201355', tracking_code='743210524705', order_notes='Tracking 743210524705' WHERE order_id=10461;
UPDATE orders SET customer_cccd='001229650685', ship_phone='0350365405', tracking_code='342571374314', order_notes='Tracking 342571374314' WHERE order_id=10462;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0917217290', tracking_code='449359151851', order_notes='Tracking 449359151851' WHERE order_id=10463;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0359282013', tracking_code='303796143378', order_notes='Tracking 303796143378' WHERE order_id=10464;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0910802823', tracking_code='974536110182', order_notes='Goi nguoi nhan 0910802823; xac minh CCCD 092260122246. Tracking 974536110182.' WHERE order_id=10465;
UPDATE orders SET customer_cccd='048261171560', ship_phone='0916958712', tracking_code='234529543042', order_notes='Tracking 234529543042' WHERE order_id=10466;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0932069425', tracking_code='105301489104', order_notes='Tracking 105301489104' WHERE order_id=10467;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0935903621', tracking_code='193218910447', order_notes='Tracking 193218910447' WHERE order_id=10468;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0972736130', tracking_code='860543440244', order_notes='Tracking 860543440244' WHERE order_id=10469;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0370550510', tracking_code='703333532112', order_notes='Ma van don 703333532112 — khong phai CCCD.' WHERE order_id=10470;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0961043306', tracking_code='741336013415', order_notes='Tracking 741336013415' WHERE order_id=10471;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0334531142', tracking_code='751622429565', order_notes='Goi nguoi nhan 0334531142; xac minh CCCD 001235806974. Tracking 751622429565.' WHERE order_id=10472;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0387031278', tracking_code='032046428828', order_notes='Tracking 032046428828' WHERE order_id=10473;
UPDATE orders SET customer_cccd='031252613701', ship_phone='0984149451', tracking_code='603541441896', order_notes='Tracking 603541441896' WHERE order_id=10474;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0968104120', tracking_code='588256542433', order_notes='Ma van don 588256542433 — khong phai CCCD.' WHERE order_id=10475;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0967853322', tracking_code='156650434357', order_notes='Tracking 156650434357' WHERE order_id=10476;
UPDATE orders SET customer_cccd='033250235555', ship_phone='0322030032', tracking_code='162105532001', order_notes='Tracking 162105532001' WHERE order_id=10477;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0397911013', tracking_code='891422415611', order_notes='Tracking 891422415611' WHERE order_id=10478;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0906954343', tracking_code='070343293245', order_notes='Goi nguoi nhan 0906954343; xac minh CCCD 038267220285. Tracking 070343293245.' WHERE order_id=10479;
UPDATE orders SET customer_cccd='031249679568', ship_phone='0988625316', tracking_code='061593567351', order_notes='Ma van don 061593567351 — khong phai CCCD.' WHERE order_id=10480;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0934587631', tracking_code='643605510215', order_notes='Tracking 643605510215' WHERE order_id=10481;
UPDATE orders SET customer_cccd='048253866041', ship_phone='0352794583', tracking_code='621463603341', order_notes='Tracking 621463603341' WHERE order_id=10482;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0358923590', tracking_code='418847182696', order_notes='Tracking 418847182696' WHERE order_id=10483;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0382323571', tracking_code='286043330241', order_notes='Tracking 286043330241' WHERE order_id=10484;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0354145343', tracking_code='041652780363', order_notes='Ma van don 041652780363 — khong phai CCCD.' WHERE order_id=10485;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0323204702', tracking_code='523583753243', order_notes='Goi nguoi nhan 0323204702; xac minh CCCD 079213257230. Tracking 523583753243.' WHERE order_id=10486;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0343221122', tracking_code='662822264930', order_notes='Tracking 662822264930' WHERE order_id=10487;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0322359244', tracking_code='201723533258', order_notes='Tracking 201723533258' WHERE order_id=10488;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0323551905', tracking_code='547912410540', order_notes='Tracking 547912410540' WHERE order_id=10489;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0971150720', tracking_code='424622158175', order_notes='Ma van don 424622158175 — khong phai CCCD.' WHERE order_id=10490;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0361440391', tracking_code='634432956274', order_notes='Tracking 634432956274' WHERE order_id=10491;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0985850226', tracking_code='514195266205', order_notes='Tracking 514195266205' WHERE order_id=10492;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0985390355', tracking_code='455131242105', order_notes='Goi nguoi nhan 0985390355; xac minh CCCD 048226733932. Tracking 455131242105.' WHERE order_id=10493;
UPDATE orders SET customer_cccd='048261171560', ship_phone='0329031720', tracking_code='134410013798', order_notes='Tracking 134410013798' WHERE order_id=10494;
UPDATE orders SET customer_cccd='056228744750', ship_phone='0961173453', tracking_code='214721107125', order_notes='Ma van don 214721107125 — khong phai CCCD.' WHERE order_id=10495;
UPDATE orders SET customer_cccd='031245431471', ship_phone='0984290290', tracking_code='109220643332', order_notes='Tracking 109220643332' WHERE order_id=10496;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0961088807', tracking_code='841806149440', order_notes='Tracking 841806149440' WHERE order_id=10497;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0942455236', tracking_code='941812303353', order_notes='Tracking 941812303353' WHERE order_id=10498;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0367734942', tracking_code='517177535437', order_notes='Tracking 517177535437' WHERE order_id=10499;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0336342661', tracking_code='132545358468', order_notes='Goi nguoi nhan 0336342661; xac minh CCCD 048226733932. Tracking 132545358468.' WHERE order_id=10500;
UPDATE orders SET customer_cccd='033226374328', ship_phone='0340280581', tracking_code='143612943214', order_notes='Tracking 143612943214' WHERE order_id=10501;
UPDATE orders SET customer_cccd='031252613701', ship_phone='0368165523', tracking_code='602303146101', order_notes='Tracking 602303146101' WHERE order_id=10502;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0905434091', tracking_code='557317513130', order_notes='Tracking 557317513130' WHERE order_id=10503;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0913258204', tracking_code='471311510273', order_notes='Tracking 471311510273' WHERE order_id=10504;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0323714706', tracking_code='173813333014', order_notes='Ma van don 173813333014 — khong phai CCCD.' WHERE order_id=10505;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0917204852', tracking_code='008403664352', order_notes='Tracking 008403664352' WHERE order_id=10506;
UPDATE orders SET customer_cccd='048221541620', ship_phone='0985910820', tracking_code='483758657229', order_notes='Goi nguoi nhan 0985910820; xac minh CCCD 048221541620. Tracking 483758657229.' WHERE order_id=10507;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0356005416', tracking_code='154524339792', order_notes='Tracking 154524339792' WHERE order_id=10508;
UPDATE orders SET customer_cccd='033226374328', ship_phone='0365609734', tracking_code='511555290584', order_notes='Tracking 511555290584' WHERE order_id=10509;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0983315914', tracking_code='407513222440', order_notes='Ma van don 407513222440 — khong phai CCCD.' WHERE order_id=10510;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0393012575', tracking_code='801752813450', order_notes='Tracking 801752813450' WHERE order_id=10511;
UPDATE orders SET customer_cccd='092241961807', ship_phone='0382373348', tracking_code='490829413048', order_notes='Tracking 490829413048' WHERE order_id=10512;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0342043010', tracking_code='270231001252', order_notes='Tracking 270231001252' WHERE order_id=10513;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0963478918', tracking_code='613216003312', order_notes='Goi nguoi nhan 0963478918; xac minh CCCD 031254533090. Tracking 613216003312.' WHERE order_id=10514;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0361520144', tracking_code='864140810863', order_notes='Ma van don 864140810863 — khong phai CCCD.' WHERE order_id=10515;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0371753853', tracking_code='510400974953', order_notes='Tracking 510400974953' WHERE order_id=10516;
UPDATE orders SET customer_cccd='079246856774', ship_phone='0384508205', tracking_code='937573510554', order_notes='Tracking 937573510554' WHERE order_id=10517;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0353794893', tracking_code='520950889378', order_notes='Tracking 520950889378' WHERE order_id=10518;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0905577533', tracking_code='795478145338', order_notes='Tracking 795478145338' WHERE order_id=10519;
UPDATE orders SET customer_cccd='040250435835', ship_phone='0900212924', tracking_code='634355319695', order_notes='Ma van don 634355319695 — khong phai CCCD.' WHERE order_id=10520;
UPDATE orders SET customer_cccd='048210492418', ship_phone='0910212471', tracking_code='424993124014', order_notes='Goi nguoi nhan 0910212471; xac minh CCCD 048210492418. Tracking 424993124014.' WHERE order_id=10521;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0375208603', tracking_code='077385173342', order_notes='Tracking 077385173342' WHERE order_id=10522;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0333502336', tracking_code='153437677335', order_notes='Tracking 153437677335' WHERE order_id=10523;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0970995058', tracking_code='451259949411', order_notes='Tracking 451259949411' WHERE order_id=10524;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0389397552', tracking_code='002409345470', order_notes='Ma van don 002409345470 — khong phai CCCD.' WHERE order_id=10525;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0972946351', tracking_code='025313446133', order_notes='Tracking 025313446133' WHERE order_id=10526;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0341939650', tracking_code='301212757076', order_notes='Tracking 301212757076' WHERE order_id=10527;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0903332824', tracking_code='530400199321', order_notes='Goi nguoi nhan 0903332824; xac minh CCCD 092244057004. Tracking 530400199321.' WHERE order_id=10528;
UPDATE orders SET customer_cccd='092211651262', ship_phone='0381024335', tracking_code='321205083637', order_notes='Tracking 321205083637' WHERE order_id=10529;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0989909322', tracking_code='340227202354', order_notes='Ma van don 340227202354 — khong phai CCCD.' WHERE order_id=10530;
UPDATE orders SET customer_cccd='040215439252', ship_phone='0971516419', tracking_code='522366105921', order_notes='Tracking 522366105921' WHERE order_id=10531;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0391516140', tracking_code='428901284551', order_notes='Tracking 428901284551' WHERE order_id=10532;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0328148285', tracking_code='540808063225', order_notes='Tracking 540808063225' WHERE order_id=10533;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0344810304', tracking_code='901956964160', order_notes='Tracking 901956964160' WHERE order_id=10534;
UPDATE orders SET customer_cccd='048221541620', ship_phone='0359136015', tracking_code='117224744480', order_notes='Goi nguoi nhan 0359136015; xac minh CCCD 048221541620. Tracking 117224744480.' WHERE order_id=10535;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0945316041', tracking_code='157903926703', order_notes='Tracking 157903926703' WHERE order_id=10536;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0330191310', tracking_code='213235343595', order_notes='Tracking 213235343595' WHERE order_id=10537;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0973255424', tracking_code='153054190054', order_notes='Tracking 153054190054' WHERE order_id=10538;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0387384635', tracking_code='935500697884', order_notes='Tracking 935500697884' WHERE order_id=10539;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0966176049', tracking_code='939012815931', order_notes='Ma van don 939012815931 — khong phai CCCD.' WHERE order_id=10540;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0983341020', tracking_code='445071111232', order_notes='Tracking 445071111232' WHERE order_id=10541;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0346225253', tracking_code='121279502748', order_notes='Goi nguoi nhan 0346225253; xac minh CCCD 056265265304. Tracking 121279502748.' WHERE order_id=10542;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0338066333', tracking_code='912501225434', order_notes='Tracking 912501225434' WHERE order_id=10543;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0913334711', tracking_code='210563403362', order_notes='Tracking 210563403362' WHERE order_id=10544;
UPDATE orders SET customer_cccd='048253866041', ship_phone='0324410408', tracking_code='631660114393', order_notes='Ma van don 631660114393 — khong phai CCCD.' WHERE order_id=10545;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0930813357', tracking_code='511017323431', order_notes='Tracking 511017323431' WHERE order_id=10546;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0917953129', tracking_code='060225456005', order_notes='Tracking 060225456005' WHERE order_id=10547;
UPDATE orders SET customer_cccd='001255907270', ship_phone='0374249133', tracking_code='419140310502', order_notes='Tracking 419140310502' WHERE order_id=10548;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0347420582', tracking_code='786602562476', order_notes='Goi nguoi nhan 0347420582; xac minh CCCD 001261085930. Tracking 786602562476.' WHERE order_id=10549;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0904719355', tracking_code='436453088013', order_notes='Ma van don 436453088013 — khong phai CCCD.' WHERE order_id=10550;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0347922189', tracking_code='913525571401', order_notes='Tracking 913525571401' WHERE order_id=10551;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0989194354', tracking_code='649007303120', order_notes='Tracking 649007303120' WHERE order_id=10552;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0912556930', tracking_code='641424021032', order_notes='Tracking 641424021032' WHERE order_id=10553;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0903290999', tracking_code='472109359804', order_notes='Tracking 472109359804' WHERE order_id=10554;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0320603756', tracking_code='637166752302', order_notes='Ma van don 637166752302 — khong phai CCCD.' WHERE order_id=10555;
UPDATE orders SET customer_cccd='046222239335', ship_phone='0976810664', tracking_code='120054365123', order_notes='Goi nguoi nhan 0976810664; xac minh CCCD 046222239335. Tracking 120054365123.' WHERE order_id=10556;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0905652152', tracking_code='225045205173', order_notes='Tracking 225045205173' WHERE order_id=10557;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0972234627', tracking_code='543042174251', order_notes='Tracking 543042174251' WHERE order_id=10558;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0943162734', tracking_code='221051103091', order_notes='Tracking 221051103091' WHERE order_id=10559;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0906113584', tracking_code='864749423439', order_notes='Ma van don 864749423439 — khong phai CCCD.' WHERE order_id=10560;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0344211145', tracking_code='481324065078', order_notes='Tracking 481324065078' WHERE order_id=10561;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0915634211', tracking_code='132444207174', order_notes='Tracking 132444207174' WHERE order_id=10562;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0942542693', tracking_code='555540433330', order_notes='Goi nguoi nhan 0942542693; xac minh CCCD 001228014805. Tracking 555540433330.' WHERE order_id=10563;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0353881049', tracking_code='017321119332', order_notes='Tracking 017321119332' WHERE order_id=10564;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0387827801', tracking_code='210333901620', order_notes='Ma van don 210333901620 — khong phai CCCD.' WHERE order_id=10565;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0941256832', tracking_code='387958244541', order_notes='Tracking 387958244541' WHERE order_id=10566;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0902360155', tracking_code='160440074553', order_notes='Tracking 160440074553' WHERE order_id=10567;
UPDATE orders SET customer_cccd='031227576727', ship_phone='0931446613', tracking_code='142596404601', order_notes='Tracking 142596404601' WHERE order_id=10568;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0961973312', tracking_code='015487623515', order_notes='Tracking 015487623515' WHERE order_id=10569;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0335953344', tracking_code='412218141859', order_notes='Goi nguoi nhan 0335953344; xac minh CCCD 033223595251. Tracking 412218141859.' WHERE order_id=10570;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0935153018', tracking_code='256188385216', order_notes='Tracking 256188385216' WHERE order_id=10571;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0333046080', tracking_code='161518124857', order_notes='Tracking 161518124857' WHERE order_id=10572;
UPDATE orders SET customer_cccd='048221541620', ship_phone='0335795192', tracking_code='480255153235', order_notes='Tracking 480255153235' WHERE order_id=10573;
UPDATE orders SET customer_cccd='048225134053', ship_phone='0975312230', tracking_code='126182693221', order_notes='Tracking 126182693221' WHERE order_id=10574;
UPDATE orders SET customer_cccd='031261827644', ship_phone='0374351412', tracking_code='129571168411', order_notes='Ma van don 129571168411 — khong phai CCCD.' WHERE order_id=10575;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0946509311', tracking_code='306638286344', order_notes='Tracking 306638286344' WHERE order_id=10576;
UPDATE orders SET customer_cccd='048225134053', ship_phone='0380434325', tracking_code='102233353522', order_notes='Goi nguoi nhan 0380434325; xac minh CCCD 048225134053. Tracking 102233353522.' WHERE order_id=10577;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0968741551', tracking_code='583042096854', order_notes='Tracking 583042096854' WHERE order_id=10578;
UPDATE orders SET customer_cccd='048262272324', ship_phone='0980265060', tracking_code='420022454755', order_notes='Tracking 420022454755' WHERE order_id=10579;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0910622663', tracking_code='949620534500', order_notes='Ma van don 949620534500 — khong phai CCCD.' WHERE order_id=10580;
UPDATE orders SET customer_cccd='092241961807', ship_phone='0945341386', tracking_code='324846453881', order_notes='Tracking 324846453881' WHERE order_id=10581;
UPDATE orders SET customer_cccd='033226374328', ship_phone='0945732853', tracking_code='205406379543', order_notes='Tracking 205406379543' WHERE order_id=10582;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0352131365', tracking_code='924060757151', order_notes='Tracking 924060757151' WHERE order_id=10583;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0940324463', tracking_code='222107351680', order_notes='Goi nguoi nhan 0940324463; xac minh CCCD 046234423770. Tracking 222107351680.' WHERE order_id=10584;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0981314401', tracking_code='747670281552', order_notes='Ma van don 747670281552 — khong phai CCCD.' WHERE order_id=10585;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0947521273', tracking_code='712187308744', order_notes='Tracking 712187308744' WHERE order_id=10586;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0942522997', tracking_code='744317244525', order_notes='Tracking 744317244525' WHERE order_id=10587;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0339400564', tracking_code='560117800679', order_notes='Tracking 560117800679' WHERE order_id=10588;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0369851322', tracking_code='454132025180', order_notes='Tracking 454132025180' WHERE order_id=10589;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0980100849', tracking_code='451274247524', order_notes='Ma van don 451274247524 — khong phai CCCD.' WHERE order_id=10590;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0948301360', tracking_code='122694351724', order_notes='Goi nguoi nhan 0948301360; xac minh CCCD 092260122246. Tracking 122694351724.' WHERE order_id=10591;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0391105316', tracking_code='326427921110', order_notes='Tracking 326427921110' WHERE order_id=10592;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0930517692', tracking_code='691155635642', order_notes='Tracking 691155635642' WHERE order_id=10593;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0980143253', tracking_code='576188309321', order_notes='Tracking 576188309321' WHERE order_id=10594;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0960410530', tracking_code='814321393925', order_notes='Ma van don 814321393925 — khong phai CCCD.' WHERE order_id=10595;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0904745013', tracking_code='494133593797', order_notes='Tracking 494133593797' WHERE order_id=10596;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0350100200', tracking_code='758043717809', order_notes='Tracking 758043717809' WHERE order_id=10597;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0933742534', tracking_code='752329043154', order_notes='Goi nguoi nhan 0933742534; xac minh CCCD 038267220285. Tracking 752329043154.' WHERE order_id=10598;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0930069405', tracking_code='235552299311', order_notes='Tracking 235552299311' WHERE order_id=10599;
UPDATE orders SET customer_cccd='092210431243', ship_phone='0937104722', tracking_code='197090213573', order_notes='Ma van don 197090213573 — khong phai CCCD.' WHERE order_id=10600;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0932374931', tracking_code='345363345006', order_notes='Tracking 345363345006' WHERE order_id=10601;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0382584810', tracking_code='819233555441', order_notes='Tracking 819233555441' WHERE order_id=10602;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0916134054', tracking_code='127545521037', order_notes='Tracking 127545521037' WHERE order_id=10603;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0941837114', tracking_code='915359503139', order_notes='Tracking 915359503139' WHERE order_id=10604;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0974415305', tracking_code='103932503003', order_notes='Goi nguoi nhan 0974415305; xac minh CCCD 033223595251. Tracking 103932503003.' WHERE order_id=10605;
UPDATE orders SET customer_cccd='031245431471', ship_phone='0399013067', tracking_code='254531268159', order_notes='Tracking 254531268159' WHERE order_id=10606;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0345865991', tracking_code='084523375016', order_notes='Tracking 084523375016' WHERE order_id=10607;
UPDATE orders SET customer_cccd='001255907270', ship_phone='0345427913', tracking_code='314519160460', order_notes='Tracking 314519160460' WHERE order_id=10608;
UPDATE orders SET customer_cccd='031267344633', ship_phone='0969302480', tracking_code='405670105542', order_notes='Tracking 405670105542' WHERE order_id=10609;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0912783327', tracking_code='218355810415', order_notes='Ma van don 218355810415 — khong phai CCCD.' WHERE order_id=10610;
UPDATE orders SET customer_cccd='092210212206', ship_phone='0915232404', tracking_code='035183155052', order_notes='Tracking 035183155052' WHERE order_id=10611;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0945743450', tracking_code='923541283620', order_notes='Goi nguoi nhan 0945743450; xac minh CCCD 056225432578. Tracking 923541283620.' WHERE order_id=10612;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0904157417', tracking_code='527327455134', order_notes='Tracking 527327455134' WHERE order_id=10613;
UPDATE orders SET customer_cccd='033226374328', ship_phone='0942722604', tracking_code='897210809502', order_notes='Tracking 897210809502' WHERE order_id=10614;
UPDATE orders SET customer_cccd='033260203083', ship_phone='0352100004', tracking_code='026381220219', order_notes='Ma van don 026381220219 — khong phai CCCD.' WHERE order_id=10615;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0375752524', tracking_code='921109292924', order_notes='Tracking 921109292924' WHERE order_id=10616;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0974040048', tracking_code='221310433041', order_notes='Tracking 221310433041' WHERE order_id=10617;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0910560248', tracking_code='120323652560', order_notes='Tracking 120323652560' WHERE order_id=10618;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0347633737', tracking_code='298442235242', order_notes='Goi nguoi nhan 0347633737; xac minh CCCD 033223595251. Tracking 298442235242.' WHERE order_id=10619;
UPDATE orders SET customer_cccd='056228744750', ship_phone='0337146131', tracking_code='241289402346', order_notes='Ma van don 241289402346 — khong phai CCCD.' WHERE order_id=10620;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0371231433', tracking_code='833412575035', order_notes='Tracking 833412575035' WHERE order_id=10621;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0975542060', tracking_code='051233419928', order_notes='Tracking 051233419928' WHERE order_id=10622;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0919107907', tracking_code='595233636146', order_notes='Tracking 595233636146' WHERE order_id=10623;
UPDATE orders SET customer_cccd='001232730093', ship_phone='0902503400', tracking_code='246624383903', order_notes='Tracking 246624383903' WHERE order_id=10624;
UPDATE orders SET customer_cccd='040280283936', ship_phone='0960478945', tracking_code='203100237071', order_notes='Ma van don 203100237071 — khong phai CCCD.' WHERE order_id=10625;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0907693217', tracking_code='288078750493', order_notes='Goi nguoi nhan 0907693217; xac minh CCCD 079265505644. Tracking 288078750493.' WHERE order_id=10626;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0904617816', tracking_code='066270220703', order_notes='Tracking 066270220703' WHERE order_id=10627;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0906484029', tracking_code='431508543724', order_notes='Tracking 431508543724' WHERE order_id=10628;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0947353442', tracking_code='415540510522', order_notes='Tracking 415540510522' WHERE order_id=10629;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0972418214', tracking_code='473211848035', order_notes='Ma van don 473211848035 — khong phai CCCD.' WHERE order_id=10630;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0975416864', tracking_code='429170148422', order_notes='Tracking 429170148422' WHERE order_id=10631;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0948613258', tracking_code='801861248481', order_notes='Tracking 801861248481' WHERE order_id=10632;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0364467502', tracking_code='430034004315', order_notes='Goi nguoi nhan 0364467502; xac minh CCCD 031254533090. Tracking 430034004315.' WHERE order_id=10633;
UPDATE orders SET customer_cccd='031249679568', ship_phone='0360052901', tracking_code='085537556370', order_notes='Tracking 085537556370' WHERE order_id=10634;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0946220872', tracking_code='589538299543', order_notes='Ma van don 589538299543 — khong phai CCCD.' WHERE order_id=10635;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0397383129', tracking_code='613050382035', order_notes='Tracking 613050382035' WHERE order_id=10636;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0390032764', tracking_code='140196496362', order_notes='Tracking 140196496362' WHERE order_id=10637;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0905048792', tracking_code='556363930280', order_notes='Tracking 556363930280' WHERE order_id=10638;
UPDATE orders SET customer_cccd='040250435835', ship_phone='0385127741', tracking_code='995209237822', order_notes='Tracking 995209237822' WHERE order_id=10639;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0345210419', tracking_code='448043223170', order_notes='Goi nguoi nhan 0345210419; xac minh CCCD 079211269325. Tracking 448043223170.' WHERE order_id=10640;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0949260147', tracking_code='325851330637', order_notes='Tracking 325851330637' WHERE order_id=10641;
UPDATE orders SET customer_cccd='046222239335', ship_phone='0365300210', tracking_code='549742815119', order_notes='Tracking 549742815119' WHERE order_id=10642;
UPDATE orders SET customer_cccd='033254456184', ship_phone='0914052433', tracking_code='218238995579', order_notes='Tracking 218238995579' WHERE order_id=10643;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0343063804', tracking_code='450318525330', order_notes='Tracking 450318525330' WHERE order_id=10644;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0939574064', tracking_code='580504035120', order_notes='Ma van don 580504035120 — khong phai CCCD.' WHERE order_id=10645;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0394461136', tracking_code='125820582273', order_notes='Tracking 125820582273' WHERE order_id=10646;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0387154314', tracking_code='061223713881', order_notes='Goi nguoi nhan 0387154314; xac minh CCCD 079215955122. Tracking 061223713881.' WHERE order_id=10647;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0974806170', tracking_code='525476143624', order_notes='Tracking 525476143624' WHERE order_id=10648;
UPDATE orders SET customer_cccd='092211651262', ship_phone='0980134722', tracking_code='322193150268', order_notes='Tracking 322193150268' WHERE order_id=10649;
UPDATE orders SET customer_cccd='092241961807', ship_phone='0371252474', tracking_code='550344641101', order_notes='Ma van don 550344641101 — khong phai CCCD.' WHERE order_id=10650;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0900366627', tracking_code='090020756754', order_notes='Tracking 090020756754' WHERE order_id=10651;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0380102913', tracking_code='227552393805', order_notes='Tracking 227552393805' WHERE order_id=10652;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0968800137', tracking_code='241158641869', order_notes='Tracking 241158641869' WHERE order_id=10653;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0932335063', tracking_code='475278150530', order_notes='Goi nguoi nhan 0932335063; xac minh CCCD 079265505644. Tracking 475278150530.' WHERE order_id=10654;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0939158223', tracking_code='402415503583', order_notes='Ma van don 402415503583 — khong phai CCCD.' WHERE order_id=10655;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0971437813', tracking_code='132124204113', order_notes='Tracking 132124204113' WHERE order_id=10656;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0350091039', tracking_code='552782018403', order_notes='Tracking 552782018403' WHERE order_id=10657;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0383430255', tracking_code='552002549391', order_notes='Tracking 552002549391' WHERE order_id=10658;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0984711514', tracking_code='432908384130', order_notes='Tracking 432908384130' WHERE order_id=10659;
UPDATE orders SET customer_cccd='092210431243', ship_phone='0975043405', tracking_code='934244445308', order_notes='Ma van don 934244445308 — khong phai CCCD.' WHERE order_id=10660;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0334800150', tracking_code='015046428575', order_notes='Goi nguoi nhan 0334800150; xac minh CCCD 079265313420. Tracking 015046428575.' WHERE order_id=10661;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0978817349', tracking_code='596915316012', order_notes='Tracking 596915316012' WHERE order_id=10662;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0338203149', tracking_code='153757393411', order_notes='Tracking 153757393411' WHERE order_id=10663;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0912907312', tracking_code='819347938852', order_notes='Tracking 819347938852' WHERE order_id=10664;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0908058082', tracking_code='894831340522', order_notes='Ma van don 894831340522 — khong phai CCCD.' WHERE order_id=10665;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0981256840', tracking_code='063731736184', order_notes='Tracking 063731736184' WHERE order_id=10666;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0370532560', tracking_code='104442609790', order_notes='Tracking 104442609790' WHERE order_id=10667;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0918013242', tracking_code='020110362385', order_notes='Goi nguoi nhan 0918013242; xac minh CCCD 079211269325. Tracking 020110362385.' WHERE order_id=10668;
UPDATE orders SET customer_cccd='046222239335', ship_phone='0353948105', tracking_code='121892943622', order_notes='Tracking 121892943622' WHERE order_id=10669;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0361853291', tracking_code='371623556454', order_notes='Ma van don 371623556454 — khong phai CCCD.' WHERE order_id=10670;
UPDATE orders SET customer_cccd='038271911005', ship_phone='0357155224', tracking_code='025308890171', order_notes='Tracking 025308890171' WHERE order_id=10671;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0394037690', tracking_code='659904526282', order_notes='Tracking 659904526282' WHERE order_id=10672;
UPDATE orders SET customer_cccd='033260203083', ship_phone='0940343590', tracking_code='212094853858', order_notes='Tracking 212094853858' WHERE order_id=10673;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0361162015', tracking_code='266323100092', order_notes='Tracking 266323100092' WHERE order_id=10674;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0320291019', tracking_code='283160914008', order_notes='Goi nguoi nhan 0320291019; xac minh CCCD 056253350043. Tracking 283160914008.' WHERE order_id=10675;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0333633035', tracking_code='620020553452', order_notes='Tracking 620020553452' WHERE order_id=10676;
UPDATE orders SET customer_cccd='048221541620', ship_phone='0902696415', tracking_code='318279341101', order_notes='Tracking 318279341101' WHERE order_id=10677;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0973034441', tracking_code='530815141522', order_notes='Tracking 530815141522' WHERE order_id=10678;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0398564539', tracking_code='837302011212', order_notes='Tracking 837302011212' WHERE order_id=10679;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0399484796', tracking_code='827077342173', order_notes='Ma van don 827077342173 — khong phai CCCD.' WHERE order_id=10680;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0960800583', tracking_code='323783543052', order_notes='Tracking 323783543052' WHERE order_id=10681;
UPDATE orders SET customer_cccd='048221541620', ship_phone='0321165604', tracking_code='034835851220', order_notes='Goi nguoi nhan 0321165604; xac minh CCCD 048221541620. Tracking 034835851220.' WHERE order_id=10682;
UPDATE orders SET customer_cccd='031267344633', ship_phone='0323081411', tracking_code='534480102531', order_notes='Tracking 534480102531' WHERE order_id=10683;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0350957693', tracking_code='481456132492', order_notes='Tracking 481456132492' WHERE order_id=10684;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0358364250', tracking_code='411208453926', order_notes='Ma van don 411208453926 — khong phai CCCD.' WHERE order_id=10685;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0364342701', tracking_code='624739511881', order_notes='Tracking 624739511881' WHERE order_id=10686;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0381028385', tracking_code='024616312328', order_notes='Tracking 024616312328' WHERE order_id=10687;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0333286353', tracking_code='084216198718', order_notes='Tracking 084216198718' WHERE order_id=10688;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0371300550', tracking_code='232282541534', order_notes='Goi nguoi nhan 0371300550; xac minh CCCD 079265505644. Tracking 232282541534.' WHERE order_id=10689;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0335265370', tracking_code='231920922578', order_notes='Ma van don 231920922578 — khong phai CCCD.' WHERE order_id=10690;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0970836988', tracking_code='311641504592', order_notes='Tracking 311641504592' WHERE order_id=10691;
UPDATE orders SET customer_cccd='033254456184', ship_phone='0364495425', tracking_code='412022045533', order_notes='Tracking 412022045533' WHERE order_id=10692;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0915923105', tracking_code='345074765147', order_notes='Tracking 345074765147' WHERE order_id=10693;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0331372452', tracking_code='230210125495', order_notes='Tracking 230210125495' WHERE order_id=10694;
UPDATE orders SET customer_cccd='033260203083', ship_phone='0325605526', tracking_code='330173104420', order_notes='Ma van don 330173104420 — khong phai CCCD.' WHERE order_id=10695;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0989083013', tracking_code='549929410014', order_notes='Goi nguoi nhan 0989083013; xac minh CCCD 048231011831. Tracking 549929410014.' WHERE order_id=10696;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0942679043', tracking_code='422075977257', order_notes='Tracking 422075977257' WHERE order_id=10697;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0357068024', tracking_code='230253544013', order_notes='Tracking 230253544013' WHERE order_id=10698;
UPDATE orders SET customer_cccd='031261827644', ship_phone='0343026202', tracking_code='023596453317', order_notes='Tracking 023596453317' WHERE order_id=10699;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0947202512', tracking_code='715314031606', order_notes='Ma van don 715314031606 — khong phai CCCD.' WHERE order_id=10700;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0326446454', tracking_code='045878249051', order_notes='Tracking 045878249051' WHERE order_id=10701;
UPDATE orders SET customer_cccd='033254456184', ship_phone='0941495395', tracking_code='625252962501', order_notes='Tracking 625252962501' WHERE order_id=10702;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0394058756', tracking_code='465553613033', order_notes='Goi nguoi nhan 0394058756; xac minh CCCD 092274529665. Tracking 465553613033.' WHERE order_id=10703;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0345403543', tracking_code='561773165165', order_notes='Tracking 561773165165' WHERE order_id=10704;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0934213242', tracking_code='064800750127', order_notes='Ma van don 064800750127 — khong phai CCCD.' WHERE order_id=10705;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0968354440', tracking_code='133501570232', order_notes='Tracking 133501570232' WHERE order_id=10706;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0981483326', tracking_code='764345520217', order_notes='Tracking 764345520217' WHERE order_id=10707;
UPDATE orders SET customer_cccd='031257742610', ship_phone='0377295661', tracking_code='854676357044', order_notes='Tracking 854676357044' WHERE order_id=10708;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0901851472', tracking_code='952925004998', order_notes='Tracking 952925004998' WHERE order_id=10709;
UPDATE orders SET customer_cccd='031225011357', ship_phone='0358752193', tracking_code='234951092414', order_notes='Goi nguoi nhan 0358752193; xac minh CCCD 031225011357. Tracking 234951092414.' WHERE order_id=10710;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0344742381', tracking_code='292006224714', order_notes='Tracking 292006224714' WHERE order_id=10711;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0356954835', tracking_code='431466031120', order_notes='Tracking 431466031120' WHERE order_id=10712;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0974654581', tracking_code='011514525805', order_notes='Tracking 011514525805' WHERE order_id=10713;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0322215555', tracking_code='004027374761', order_notes='Tracking 004027374761' WHERE order_id=10714;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0911748216', tracking_code='763741430126', order_notes='Ma van don 763741430126 — khong phai CCCD.' WHERE order_id=10715;
UPDATE orders SET customer_cccd='046231230085', ship_phone='0369455342', tracking_code='514317280256', order_notes='Tracking 514317280256' WHERE order_id=10716;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0989581117', tracking_code='095872763936', order_notes='Goi nguoi nhan 0989581117; xac minh CCCD 056253350043. Tracking 095872763936.' WHERE order_id=10717;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0352448000', tracking_code='635050492408', order_notes='Tracking 635050492408' WHERE order_id=10718;
UPDATE orders SET customer_cccd='048262272324', ship_phone='0365321362', tracking_code='505343460302', order_notes='Tracking 505343460302' WHERE order_id=10719;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0967654324', tracking_code='245444766242', order_notes='Ma van don 245444766242 — khong phai CCCD.' WHERE order_id=10720;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0969231482', tracking_code='401706522055', order_notes='Tracking 401706522055' WHERE order_id=10721;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0389373330', tracking_code='588554151567', order_notes='Tracking 588554151567' WHERE order_id=10722;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0960514181', tracking_code='153333142100', order_notes='Tracking 153333142100' WHERE order_id=10723;
UPDATE orders SET customer_cccd='033223595251', ship_phone='0370492507', tracking_code='662345243500', order_notes='Goi nguoi nhan 0370492507; xac minh CCCD 033223595251. Tracking 662345243500.' WHERE order_id=10724;
UPDATE orders SET customer_cccd='092241961807', ship_phone='0948759740', tracking_code='053409455821', order_notes='Ma van don 053409455821 — khong phai CCCD.' WHERE order_id=10725;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0970100314', tracking_code='972258360543', order_notes='Tracking 972258360543' WHERE order_id=10726;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0339342281', tracking_code='116250738864', order_notes='Tracking 116250738864' WHERE order_id=10727;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0975106351', tracking_code='230223014923', order_notes='Tracking 230223014923' WHERE order_id=10728;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0321852263', tracking_code='100115475379', order_notes='Tracking 100115475379' WHERE order_id=10729;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0934134033', tracking_code='223533204034', order_notes='Ma van don 223533204034 — khong phai CCCD.' WHERE order_id=10730;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0330584924', tracking_code='007952231092', order_notes='Goi nguoi nhan 0330584924; xac minh CCCD 048210984228. Tracking 007952231092.' WHERE order_id=10731;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0344769193', tracking_code='997021271587', order_notes='Tracking 997021271587' WHERE order_id=10732;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0361304022', tracking_code='227049712488', order_notes='Tracking 227049712488' WHERE order_id=10733;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0395761339', tracking_code='326232497326', order_notes='Tracking 326232497326' WHERE order_id=10734;
UPDATE orders SET customer_cccd='048262272324', ship_phone='0971946175', tracking_code='096080733484', order_notes='Ma van don 096080733484 — khong phai CCCD.' WHERE order_id=10735;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0914414318', tracking_code='165928624108', order_notes='Tracking 165928624108' WHERE order_id=10736;
UPDATE orders SET customer_cccd='038263451360', ship_phone='0321559250', tracking_code='584395550051', order_notes='Tracking 584395550051' WHERE order_id=10737;
UPDATE orders SET customer_cccd='048231573405', ship_phone='0942531814', tracking_code='589654434191', order_notes='Goi nguoi nhan 0942531814; xac minh CCCD 048231573405. Tracking 589654434191.' WHERE order_id=10738;
UPDATE orders SET customer_cccd='038263451360', ship_phone='0363211862', tracking_code='104512809686', order_notes='Tracking 104512809686' WHERE order_id=10739;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0971428492', tracking_code='457246368426', order_notes='Ma van don 457246368426 — khong phai CCCD.' WHERE order_id=10740;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0909665410', tracking_code='411410453862', order_notes='Tracking 411410453862' WHERE order_id=10741;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0980249882', tracking_code='485044403231', order_notes='Tracking 485044403231' WHERE order_id=10742;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0329233255', tracking_code='973348134495', order_notes='Tracking 973348134495' WHERE order_id=10743;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0341350414', tracking_code='485164594893', order_notes='Tracking 485164594893' WHERE order_id=10744;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0331432632', tracking_code='168401429425', order_notes='Goi nguoi nhan 0331432632; xac minh CCCD 001261085930. Tracking 168401429425.' WHERE order_id=10745;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0349726733', tracking_code='831551841034', order_notes='Tracking 831551841034' WHERE order_id=10746;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0941356204', tracking_code='441508668131', order_notes='Tracking 441508668131' WHERE order_id=10747;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0323534291', tracking_code='018522255751', order_notes='Tracking 018522255751' WHERE order_id=10748;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0961621588', tracking_code='084523009538', order_notes='Tracking 084523009538' WHERE order_id=10749;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0363559372', tracking_code='171284249054', order_notes='Ma van don 171284249054 — khong phai CCCD.' WHERE order_id=10750;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0395521334', tracking_code='416100874284', order_notes='Tracking 416100874284' WHERE order_id=10751;
UPDATE orders SET customer_cccd='079246856774', ship_phone='0906243622', tracking_code='546126793034', order_notes='Goi nguoi nhan 0906243622; xac minh CCCD 079246856774. Tracking 546126793034.' WHERE order_id=10752;
UPDATE orders SET customer_cccd='031225011357', ship_phone='0354593042', tracking_code='743580780705', order_notes='Tracking 743580780705' WHERE order_id=10753;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0908821595', tracking_code='236533480378', order_notes='Tracking 236533480378' WHERE order_id=10754;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0982945020', tracking_code='750305080539', order_notes='Ma van don 750305080539 — khong phai CCCD.' WHERE order_id=10755;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0396529036', tracking_code='125021917091', order_notes='Tracking 125021917091' WHERE order_id=10756;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0375118075', tracking_code='485343415833', order_notes='Tracking 485343415833' WHERE order_id=10757;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0904919590', tracking_code='846276451073', order_notes='Tracking 846276451073' WHERE order_id=10758;
UPDATE orders SET customer_cccd='040280283936', ship_phone='0364441060', tracking_code='036589164430', order_notes='Goi nguoi nhan 0364441060; xac minh CCCD 040280283936. Tracking 036589164430.' WHERE order_id=10759;
UPDATE orders SET customer_cccd='092211651262', ship_phone='0330683990', tracking_code='721753024627', order_notes='Ma van don 721753024627 — khong phai CCCD.' WHERE order_id=10760;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0356456554', tracking_code='300214903452', order_notes='Tracking 300214903452' WHERE order_id=10761;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0913043600', tracking_code='583156335452', order_notes='Tracking 583156335452' WHERE order_id=10762;
UPDATE orders SET customer_cccd='031249679568', ship_phone='0931127604', tracking_code='872915203893', order_notes='Tracking 872915203893' WHERE order_id=10763;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0932133208', tracking_code='206114407237', order_notes='Tracking 206114407237' WHERE order_id=10764;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0962210473', tracking_code='654714322463', order_notes='Ma van don 654714322463 — khong phai CCCD.' WHERE order_id=10765;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0972240525', tracking_code='352026756601', order_notes='Goi nguoi nhan 0972240525; xac minh CCCD 092220520021. Tracking 352026756601.' WHERE order_id=10766;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0351410450', tracking_code='103642132533', order_notes='Tracking 103642132533' WHERE order_id=10767;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0335678524', tracking_code='572559542490', order_notes='Tracking 572559542490' WHERE order_id=10768;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0383131474', tracking_code='112214703431', order_notes='Tracking 112214703431' WHERE order_id=10769;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0981725224', tracking_code='746221112586', order_notes='Ma van don 746221112586 — khong phai CCCD.' WHERE order_id=10770;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0933520235', tracking_code='795023480227', order_notes='Tracking 795023480227' WHERE order_id=10771;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0911409466', tracking_code='770902911576', order_notes='Tracking 770902911576' WHERE order_id=10772;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0325241827', tracking_code='278230351106', order_notes='Goi nguoi nhan 0325241827; xac minh CCCD 031254533090. Tracking 278230351106.' WHERE order_id=10773;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0397790345', tracking_code='022655233337', order_notes='Tracking 022655233337' WHERE order_id=10774;
UPDATE orders SET customer_cccd='001232730093', ship_phone='0338349125', tracking_code='421181015625', order_notes='Ma van don 421181015625 — khong phai CCCD.' WHERE order_id=10775;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0374525542', tracking_code='442171495553', order_notes='Tracking 442171495553' WHERE order_id=10776;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0978002201', tracking_code='700584522007', order_notes='Tracking 700584522007' WHERE order_id=10777;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0976834850', tracking_code='547025642227', order_notes='Tracking 547025642227' WHERE order_id=10778;
UPDATE orders SET customer_cccd='031261827644', ship_phone='0983904070', tracking_code='434576304019', order_notes='Tracking 434576304019' WHERE order_id=10779;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0984094512', tracking_code='582281192825', order_notes='Goi nguoi nhan 0984094512; xac minh CCCD 092261351332. Tracking 582281192825.' WHERE order_id=10780;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0397605451', tracking_code='412424610840', order_notes='Tracking 412424610840' WHERE order_id=10781;
UPDATE orders SET customer_cccd='048210492418', ship_phone='0919264071', tracking_code='449702401376', order_notes='Tracking 449702401376' WHERE order_id=10782;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0320540831', tracking_code='755292571511', order_notes='Tracking 755292571511' WHERE order_id=10783;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0976578719', tracking_code='217098375897', order_notes='Tracking 217098375897' WHERE order_id=10784;
UPDATE orders SET customer_cccd='031234758892', ship_phone='0963015045', tracking_code='471026824309', order_notes='Ma van don 471026824309 — khong phai CCCD.' WHERE order_id=10785;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0931550811', tracking_code='502220617320', order_notes='Tracking 502220617320' WHERE order_id=10786;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0398105089', tracking_code='104248652702', order_notes='Goi nguoi nhan 0398105089; xac minh CCCD 048226733932. Tracking 104248652702.' WHERE order_id=10787;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0937034710', tracking_code='024324211300', order_notes='Tracking 024324211300' WHERE order_id=10788;
UPDATE orders SET customer_cccd='031249679568', ship_phone='0974154514', tracking_code='327024924192', order_notes='Tracking 327024924192' WHERE order_id=10789;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0395002197', tracking_code='654924189807', order_notes='Ma van don 654924189807 — khong phai CCCD.' WHERE order_id=10790;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0906882981', tracking_code='844128874106', order_notes='Tracking 844128874106' WHERE order_id=10791;
UPDATE orders SET customer_cccd='092210212206', ship_phone='0904436309', tracking_code='643231820213', order_notes='Tracking 643231820213' WHERE order_id=10792;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0382721300', tracking_code='323331127634', order_notes='Tracking 323331127634' WHERE order_id=10793;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0978591845', tracking_code='777827392603', order_notes='Goi nguoi nhan 0978591845; xac minh CCCD 079215955122. Tracking 777827392603.' WHERE order_id=10794;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0361483248', tracking_code='502235632189', order_notes='Ma van don 502235632189 — khong phai CCCD.' WHERE order_id=10795;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0961750245', tracking_code='377044560449', order_notes='Tracking 377044560449' WHERE order_id=10796;
UPDATE orders SET customer_cccd='056271744241', ship_phone='0398040620', tracking_code='732348617326', order_notes='Tracking 732348617326' WHERE order_id=10797;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0338233439', tracking_code='733301531162', order_notes='Tracking 733301531162' WHERE order_id=10798;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0343441554', tracking_code='114545697422', order_notes='Tracking 114545697422' WHERE order_id=10799;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0906235100', tracking_code='823044313845', order_notes='Ma van don 823044313845 — khong phai CCCD.' WHERE order_id=10800;
UPDATE orders SET customer_cccd='079261880141', ship_phone='0977513133', tracking_code='547935406742', order_notes='Goi nguoi nhan 0977513133; xac minh CCCD 079261880141. Tracking 547935406742.' WHERE order_id=10801;
UPDATE orders SET customer_cccd='046222239335', ship_phone='0382548903', tracking_code='715344421454', order_notes='Tracking 715344421454' WHERE order_id=10802;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0979337349', tracking_code='759011664310', order_notes='Tracking 759011664310' WHERE order_id=10803;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0934233230', tracking_code='521991733008', order_notes='Tracking 521991733008' WHERE order_id=10804;
UPDATE orders SET customer_cccd='031257742610', ship_phone='0362913230', tracking_code='090449309023', order_notes='Ma van don 090449309023 — khong phai CCCD.' WHERE order_id=10805;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0396735461', tracking_code='431330302045', order_notes='Tracking 431330302045' WHERE order_id=10806;
UPDATE orders SET customer_cccd='031225011357', ship_phone='0903131424', tracking_code='742926730081', order_notes='Tracking 742926730081' WHERE order_id=10807;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0980101015', tracking_code='543410381377', order_notes='Goi nguoi nhan 0980101015; xac minh CCCD 031257553555. Tracking 543410381377.' WHERE order_id=10808;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0975512313', tracking_code='235945636570', order_notes='Tracking 235945636570' WHERE order_id=10809;
UPDATE orders SET customer_cccd='056228744750', ship_phone='0324006223', tracking_code='390542044123', order_notes='Ma van don 390542044123 — khong phai CCCD.' WHERE order_id=10810;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0362146357', tracking_code='631606138959', order_notes='Tracking 631606138959' WHERE order_id=10811;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0982510341', tracking_code='146293631502', order_notes='Tracking 146293631502' WHERE order_id=10812;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0346118201', tracking_code='333303222445', order_notes='Tracking 333303222445' WHERE order_id=10813;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0381540242', tracking_code='856274345223', order_notes='Tracking 856274345223' WHERE order_id=10814;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0905430811', tracking_code='401980070264', order_notes='Goi nguoi nhan 0905430811; xac minh CCCD 056225432578. Tracking 401980070264.' WHERE order_id=10815;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0900617038', tracking_code='225153424540', order_notes='Tracking 225153424540' WHERE order_id=10816;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0932645629', tracking_code='125057122482', order_notes='Tracking 125057122482' WHERE order_id=10817;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0371550016', tracking_code='456770194946', order_notes='Tracking 456770194946' WHERE order_id=10818;
UPDATE orders SET customer_cccd='048210492418', ship_phone='0973351200', tracking_code='582554894163', order_notes='Tracking 582554894163' WHERE order_id=10819;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0971250213', tracking_code='401234301731', order_notes='Ma van don 401234301731 — khong phai CCCD.' WHERE order_id=10820;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0972585963', tracking_code='154567534543', order_notes='Tracking 154567534543' WHERE order_id=10821;
UPDATE orders SET customer_cccd='048225134053', ship_phone='0392233519', tracking_code='449540477380', order_notes='Goi nguoi nhan 0392233519; xac minh CCCD 048225134053. Tracking 449540477380.' WHERE order_id=10822;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0906329594', tracking_code='001036357435', order_notes='Tracking 001036357435' WHERE order_id=10823;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0355076404', tracking_code='443791267544', order_notes='Tracking 443791267544' WHERE order_id=10824;
UPDATE orders SET customer_cccd='056271744241', ship_phone='0964839022', tracking_code='457504346012', order_notes='Ma van don 457504346012 — khong phai CCCD.' WHERE order_id=10825;
UPDATE orders SET customer_cccd='046234423770', ship_phone='0910568573', tracking_code='786850625429', order_notes='Tracking 786850625429' WHERE order_id=10826;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0324280492', tracking_code='531215351325', order_notes='Tracking 531215351325' WHERE order_id=10827;
UPDATE orders SET customer_cccd='046231230085', ship_phone='0904220747', tracking_code='539693349031', order_notes='Tracking 539693349031' WHERE order_id=10828;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0947029310', tracking_code='947107953270', order_notes='Goi nguoi nhan 0947029310; xac minh CCCD 056236234103. Tracking 947107953270.' WHERE order_id=10829;
UPDATE orders SET customer_cccd='031245431471', ship_phone='0987153461', tracking_code='968095400415', order_notes='Ma van don 968095400415 — khong phai CCCD.' WHERE order_id=10830;
UPDATE orders SET customer_cccd='040250435835', ship_phone='0930060035', tracking_code='945310328531', order_notes='Tracking 945310328531' WHERE order_id=10831;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0948473810', tracking_code='340053123901', order_notes='Tracking 340053123901' WHERE order_id=10832;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0902318464', tracking_code='608410880294', order_notes='Tracking 608410880294' WHERE order_id=10833;
UPDATE orders SET customer_cccd='031245431471', ship_phone='0349814001', tracking_code='082729180403', order_notes='Tracking 082729180403' WHERE order_id=10834;
UPDATE orders SET customer_cccd='033254456184', ship_phone='0947033163', tracking_code='117170115825', order_notes='Ma van don 117170115825 — khong phai CCCD.' WHERE order_id=10835;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0982505423', tracking_code='427348966504', order_notes='Goi nguoi nhan 0982505423; xac minh CCCD 031254533090. Tracking 427348966504.' WHERE order_id=10836;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0351406309', tracking_code='225732241315', order_notes='Tracking 225732241315' WHERE order_id=10837;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0344737042', tracking_code='933564901574', order_notes='Tracking 933564901574' WHERE order_id=10838;
UPDATE orders SET customer_cccd='031245431471', ship_phone='0984253384', tracking_code='793105344331', order_notes='Tracking 793105344331' WHERE order_id=10839;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0904894111', tracking_code='959942117853', order_notes='Ma van don 959942117853 — khong phai CCCD.' WHERE order_id=10840;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0383284744', tracking_code='423045750341', order_notes='Tracking 423045750341' WHERE order_id=10841;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0341725083', tracking_code='412111000815', order_notes='Tracking 412111000815' WHERE order_id=10842;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0967325544', tracking_code='474200628858', order_notes='Goi nguoi nhan 0967325544; xac minh CCCD 048242705055. Tracking 474200628858.' WHERE order_id=10843;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0917013031', tracking_code='801891487819', order_notes='Tracking 801891487819' WHERE order_id=10844;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0328148418', tracking_code='549347373337', order_notes='Ma van don 549347373337 — khong phai CCCD.' WHERE order_id=10845;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0943465022', tracking_code='532112776511', order_notes='Tracking 532112776511' WHERE order_id=10846;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0370294140', tracking_code='247531244971', order_notes='Tracking 247531244971' WHERE order_id=10847;
UPDATE orders SET customer_cccd='001229650685', ship_phone='0323323776', tracking_code='314465533153', order_notes='Tracking 314465533153' WHERE order_id=10848;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0381403155', tracking_code='430033300740', order_notes='Tracking 430033300740' WHERE order_id=10849;
UPDATE orders SET customer_cccd='048242705055', ship_phone='0381059321', tracking_code='362980502231', order_notes='Goi nguoi nhan 0381059321; xac minh CCCD 048242705055. Tracking 362980502231.' WHERE order_id=10850;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0914738544', tracking_code='444103703044', order_notes='Tracking 444103703044' WHERE order_id=10851;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0933172226', tracking_code='240825200274', order_notes='Tracking 240825200274' WHERE order_id=10852;
UPDATE orders SET customer_cccd='033226374328', ship_phone='0347216098', tracking_code='758185913273', order_notes='Tracking 758185913273' WHERE order_id=10853;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0982470531', tracking_code='261581431550', order_notes='Tracking 261581431550' WHERE order_id=10854;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0963152953', tracking_code='857458464004', order_notes='Ma van don 857458464004 — khong phai CCCD.' WHERE order_id=10855;
UPDATE orders SET customer_cccd='048221541620', ship_phone='0917722780', tracking_code='755373975420', order_notes='Tracking 755373975420' WHERE order_id=10856;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0380102294', tracking_code='996351405210', order_notes='Goi nguoi nhan 0380102294; xac minh CCCD 079265505644. Tracking 996351405210.' WHERE order_id=10857;
UPDATE orders SET customer_cccd='079240834146', ship_phone='0984942624', tracking_code='007362914008', order_notes='Tracking 007362914008' WHERE order_id=10858;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0984105315', tracking_code='114134303613', order_notes='Tracking 114134303613' WHERE order_id=10859;
UPDATE orders SET customer_cccd='038271911005', ship_phone='0972633441', tracking_code='230893087399', order_notes='Ma van don 230893087399 — khong phai CCCD.' WHERE order_id=10860;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0980411898', tracking_code='779435369403', order_notes='Tracking 779435369403' WHERE order_id=10861;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0387500440', tracking_code='512059329754', order_notes='Tracking 512059329754' WHERE order_id=10862;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0911194794', tracking_code='225318532357', order_notes='Tracking 225318532357' WHERE order_id=10863;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0344722722', tracking_code='915012562241', order_notes='Goi nguoi nhan 0344722722; xac minh CCCD 092223119120. Tracking 915012562241.' WHERE order_id=10864;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0933641023', tracking_code='225126510369', order_notes='Ma van don 225126510369 — khong phai CCCD.' WHERE order_id=10865;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0325362158', tracking_code='643052051717', order_notes='Tracking 643052051717' WHERE order_id=10866;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0967254241', tracking_code='940018314583', order_notes='Tracking 940018314583' WHERE order_id=10867;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0368813000', tracking_code='503735009439', order_notes='Tracking 503735009439' WHERE order_id=10868;
UPDATE orders SET customer_cccd='001235806974', ship_phone='0352203588', tracking_code='725005544010', order_notes='Tracking 725005544010' WHERE order_id=10869;
UPDATE orders SET customer_cccd='092210212206', ship_phone='0964053175', tracking_code='964951605414', order_notes='Ma van don 964951605414 — khong phai CCCD.' WHERE order_id=10870;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0353693100', tracking_code='443339502943', order_notes='Goi nguoi nhan 0353693100; xac minh CCCD 033222229438. Tracking 443339502943.' WHERE order_id=10871;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0911251879', tracking_code='427311706531', order_notes='Tracking 427311706531' WHERE order_id=10872;
UPDATE orders SET customer_cccd='033260203083', ship_phone='0352120410', tracking_code='556434120534', order_notes='Tracking 556434120534' WHERE order_id=10873;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0969355214', tracking_code='322413162301', order_notes='Tracking 322413162301' WHERE order_id=10874;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0915437401', tracking_code='133607045852', order_notes='Ma van don 133607045852 — khong phai CCCD.' WHERE order_id=10875;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0322459535', tracking_code='934520033285', order_notes='Tracking 934520033285' WHERE order_id=10876;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0909166851', tracking_code='348393822262', order_notes='Tracking 348393822262' WHERE order_id=10877;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0340442663', tracking_code='648213155163', order_notes='Goi nguoi nhan 0340442663; xac minh CCCD 001261085930. Tracking 648213155163.' WHERE order_id=10878;
UPDATE orders SET customer_cccd='033260203083', ship_phone='0333065511', tracking_code='351507734280', order_notes='Tracking 351507734280' WHERE order_id=10879;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0944735595', tracking_code='383693102220', order_notes='Ma van don 383693102220 — khong phai CCCD.' WHERE order_id=10880;
UPDATE orders SET customer_cccd='048210492418', ship_phone='0360329921', tracking_code='417117235561', order_notes='Tracking 417117235561' WHERE order_id=10881;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0904005191', tracking_code='252327271160', order_notes='Tracking 252327271160' WHERE order_id=10882;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0971402214', tracking_code='496110796808', order_notes='Tracking 496110796808' WHERE order_id=10883;
UPDATE orders SET customer_cccd='048262272324', ship_phone='0973202649', tracking_code='129502043146', order_notes='Tracking 129502043146' WHERE order_id=10884;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0901028082', tracking_code='121246510472', order_notes='Goi nguoi nhan 0901028082; xac minh CCCD 031211045211. Tracking 121246510472.' WHERE order_id=10885;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0972811012', tracking_code='272683283740', order_notes='Tracking 272683283740' WHERE order_id=10886;
UPDATE orders SET customer_cccd='031227576727', ship_phone='0974945424', tracking_code='303323844816', order_notes='Tracking 303323844816' WHERE order_id=10887;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0967972000', tracking_code='147343230707', order_notes='Tracking 147343230707' WHERE order_id=10888;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0380143713', tracking_code='920457920845', order_notes='Tracking 920457920845' WHERE order_id=10889;
UPDATE orders SET customer_cccd='031267344633', ship_phone='0970143700', tracking_code='190426034757', order_notes='Ma van don 190426034757 — khong phai CCCD.' WHERE order_id=10890;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0333544534', tracking_code='956020614656', order_notes='Tracking 956020614656' WHERE order_id=10891;
UPDATE orders SET customer_cccd='092211651262', ship_phone='0360841282', tracking_code='953057440310', order_notes='Goi nguoi nhan 0360841282; xac minh CCCD 092211651262. Tracking 953057440310.' WHERE order_id=10892;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0330770711', tracking_code='255054450220', order_notes='Tracking 255054450220' WHERE order_id=10893;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0905139388', tracking_code='029763333855', order_notes='Tracking 029763333855' WHERE order_id=10894;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0330577580', tracking_code='062138837552', order_notes='Ma van don 062138837552 — khong phai CCCD.' WHERE order_id=10895;
UPDATE orders SET customer_cccd='092211651262', ship_phone='0328250149', tracking_code='517835922577', order_notes='Tracking 517835922577' WHERE order_id=10896;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0912349081', tracking_code='150124232340', order_notes='Tracking 150124232340' WHERE order_id=10897;
UPDATE orders SET customer_cccd='040215439252', ship_phone='0355084503', tracking_code='495275704828', order_notes='Tracking 495275704828' WHERE order_id=10898;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0321684031', tracking_code='401426136978', order_notes='Goi nguoi nhan 0321684031; xac minh CCCD 092261351332. Tracking 401426136978.' WHERE order_id=10899;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0363573450', tracking_code='808501553431', order_notes='Ma van don 808501553431 — khong phai CCCD.' WHERE order_id=10900;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0986016014', tracking_code='671003931963', order_notes='Tracking 671003931963' WHERE order_id=10901;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0354038566', tracking_code='157193413565', order_notes='Tracking 157193413565' WHERE order_id=10902;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0974141131', tracking_code='131057130357', order_notes='Tracking 131057130357' WHERE order_id=10903;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0386540101', tracking_code='192104322444', order_notes='Tracking 192104322444' WHERE order_id=10904;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0393044259', tracking_code='030485758095', order_notes='Ma van don 030485758095 — khong phai CCCD.' WHERE order_id=10905;
UPDATE orders SET customer_cccd='092210212206', ship_phone='0964883023', tracking_code='444211191398', order_notes='Goi nguoi nhan 0964883023; xac minh CCCD 092210212206. Tracking 444211191398.' WHERE order_id=10906;
UPDATE orders SET customer_cccd='048231573405', ship_phone='0902110260', tracking_code='395342290025', order_notes='Tracking 395342290025' WHERE order_id=10907;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0323305425', tracking_code='204843736293', order_notes='Tracking 204843736293' WHERE order_id=10908;
UPDATE orders SET customer_cccd='040250435835', ship_phone='0965399490', tracking_code='221964681153', order_notes='Tracking 221964681153' WHERE order_id=10909;
UPDATE orders SET customer_cccd='033260203083', ship_phone='0945393946', tracking_code='293314244284', order_notes='Ma van don 293314244284 — khong phai CCCD.' WHERE order_id=10910;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0327734956', tracking_code='329424291500', order_notes='Tracking 329424291500' WHERE order_id=10911;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0361934014', tracking_code='550815145444', order_notes='Tracking 550815145444' WHERE order_id=10912;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0904034118', tracking_code='010931844656', order_notes='Goi nguoi nhan 0904034118; xac minh CCCD 046219121351. Tracking 010931844656.' WHERE order_id=10913;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0960025783', tracking_code='371596832095', order_notes='Tracking 371596832095' WHERE order_id=10914;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0936121863', tracking_code='730920066469', order_notes='Ma van don 730920066469 — khong phai CCCD.' WHERE order_id=10915;
UPDATE orders SET customer_cccd='046231230085', ship_phone='0964312145', tracking_code='340220484580', order_notes='Tracking 340220484580' WHERE order_id=10916;
UPDATE orders SET customer_cccd='001250825071', ship_phone='0963873106', tracking_code='540915137242', order_notes='Tracking 540915137242' WHERE order_id=10917;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0354353600', tracking_code='902014506083', order_notes='Tracking 902014506083' WHERE order_id=10918;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0320891352', tracking_code='508951012145', order_notes='Tracking 508951012145' WHERE order_id=10919;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0370106229', tracking_code='741453785322', order_notes='Goi nguoi nhan 0370106229; xac minh CCCD 092223119120. Tracking 741453785322.' WHERE order_id=10920;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0324004227', tracking_code='988670051321', order_notes='Tracking 988670051321' WHERE order_id=10921;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0968202100', tracking_code='780338302212', order_notes='Tracking 780338302212' WHERE order_id=10922;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0935592211', tracking_code='466237544708', order_notes='Tracking 466237544708' WHERE order_id=10923;
UPDATE orders SET customer_cccd='079265505644', ship_phone='0391344621', tracking_code='201702573135', order_notes='Tracking 201702573135' WHERE order_id=10924;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0331046033', tracking_code='244138572105', order_notes='Ma van don 244138572105 — khong phai CCCD.' WHERE order_id=10925;
UPDATE orders SET customer_cccd='040280283936', ship_phone='0972071326', tracking_code='535310043512', order_notes='Tracking 535310043512' WHERE order_id=10926;
UPDATE orders SET customer_cccd='079240834146', ship_phone='0323263293', tracking_code='431115939511', order_notes='Goi nguoi nhan 0323263293; xac minh CCCD 079240834146. Tracking 431115939511.' WHERE order_id=10927;
UPDATE orders SET customer_cccd='031227576727', ship_phone='0382857219', tracking_code='403315740442', order_notes='Tracking 403315740442' WHERE order_id=10928;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0930875435', tracking_code='892205143701', order_notes='Tracking 892205143701' WHERE order_id=10929;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0351557526', tracking_code='002524120781', order_notes='Ma van don 002524120781 — khong phai CCCD.' WHERE order_id=10930;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0963585552', tracking_code='696567144821', order_notes='Tracking 696567144821' WHERE order_id=10931;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0353495411', tracking_code='575065816349', order_notes='Tracking 575065816349' WHERE order_id=10932;
UPDATE orders SET customer_cccd='056236234103', ship_phone='0398450125', tracking_code='415169621109', order_notes='Tracking 415169621109' WHERE order_id=10933;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0930501937', tracking_code='795555438012', order_notes='Goi nguoi nhan 0930501937; xac minh CCCD 092285253915. Tracking 795555438012.' WHERE order_id=10934;
UPDATE orders SET customer_cccd='031226650249', ship_phone='0903251252', tracking_code='897713022291', order_notes='Ma van don 897713022291 — khong phai CCCD.' WHERE order_id=10935;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0963297141', tracking_code='444446835025', order_notes='Tracking 444446835025' WHERE order_id=10936;
UPDATE orders SET customer_cccd='048210492418', ship_phone='0902332024', tracking_code='083421702979', order_notes='Tracking 083421702979' WHERE order_id=10937;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0971295181', tracking_code='330492548243', order_notes='Tracking 330492548243' WHERE order_id=10938;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0949505641', tracking_code='523780233593', order_notes='Tracking 523780233593' WHERE order_id=10939;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0325454326', tracking_code='489154366621', order_notes='Ma van don 489154366621 — khong phai CCCD.' WHERE order_id=10940;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0375709223', tracking_code='564551054324', order_notes='Goi nguoi nhan 0375709223; xac minh CCCD 056225432578. Tracking 564551054324.' WHERE order_id=10941;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0979504195', tracking_code='925854308094', order_notes='Tracking 925854308094' WHERE order_id=10942;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0323160331', tracking_code='540437974680', order_notes='Tracking 540437974680' WHERE order_id=10943;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0385163772', tracking_code='305359615430', order_notes='Tracking 305359615430' WHERE order_id=10944;
UPDATE orders SET customer_cccd='031261827644', ship_phone='0368361527', tracking_code='241699554653', order_notes='Ma van don 241699554653 — khong phai CCCD.' WHERE order_id=10945;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0325493085', tracking_code='489611256782', order_notes='Tracking 489611256782' WHERE order_id=10946;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0984005381', tracking_code='392116201514', order_notes='Tracking 392116201514' WHERE order_id=10947;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0354860558', tracking_code='542086117011', order_notes='Goi nguoi nhan 0354860558; xac minh CCCD 031223803463. Tracking 542086117011.' WHERE order_id=10948;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0917438350', tracking_code='702588907213', order_notes='Tracking 702588907213' WHERE order_id=10949;
UPDATE orders SET customer_cccd='079212457642', ship_phone='0385392110', tracking_code='855119231921', order_notes='Ma van don 855119231921 — khong phai CCCD.' WHERE order_id=10950;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0330811967', tracking_code='251344147424', order_notes='Tracking 251344147424' WHERE order_id=10951;
UPDATE orders SET customer_cccd='033254456184', ship_phone='0983914385', tracking_code='339632533728', order_notes='Tracking 339632533728' WHERE order_id=10952;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0971727000', tracking_code='294932611154', order_notes='Tracking 294932611154' WHERE order_id=10953;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0901708254', tracking_code='875254249874', order_notes='Tracking 875254249874' WHERE order_id=10954;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0385287414', tracking_code='407120421612', order_notes='Goi nguoi nhan 0385287414; xac minh CCCD 092274529665. Tracking 407120421612.' WHERE order_id=10955;
UPDATE orders SET customer_cccd='033226374328', ship_phone='0983472456', tracking_code='026390259995', order_notes='Tracking 026390259995' WHERE order_id=10956;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0907580634', tracking_code='272031401230', order_notes='Tracking 272031401230' WHERE order_id=10957;
UPDATE orders SET customer_cccd='040215439252', ship_phone='0337286011', tracking_code='730305372255', order_notes='Tracking 730305372255' WHERE order_id=10958;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0988741981', tracking_code='927355348072', order_notes='Tracking 927355348072' WHERE order_id=10959;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0363652052', tracking_code='563282557616', order_notes='Ma van don 563282557616 — khong phai CCCD.' WHERE order_id=10960;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0932099018', tracking_code='141154108094', order_notes='Tracking 141154108094' WHERE order_id=10961;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0393471195', tracking_code='422821669425', order_notes='Goi nguoi nhan 0393471195; xac minh CCCD 001261085930. Tracking 422821669425.' WHERE order_id=10962;
UPDATE orders SET customer_cccd='048225053552', ship_phone='0351203061', tracking_code='933359260081', order_notes='Tracking 933359260081' WHERE order_id=10963;
UPDATE orders SET customer_cccd='048231573405', ship_phone='0970308724', tracking_code='576519015185', order_notes='Tracking 576519015185' WHERE order_id=10964;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0340835665', tracking_code='035405901398', order_notes='Ma van don 035405901398 — khong phai CCCD.' WHERE order_id=10965;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0368694015', tracking_code='821959038005', order_notes='Tracking 821959038005' WHERE order_id=10966;
UPDATE orders SET customer_cccd='001255907270', ship_phone='0371108516', tracking_code='215761285132', order_notes='Tracking 215761285132' WHERE order_id=10967;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0350846022', tracking_code='000746583101', order_notes='Tracking 000746583101' WHERE order_id=10968;
UPDATE orders SET customer_cccd='048261171560', ship_phone='0980353975', tracking_code='314073874991', order_notes='Goi nguoi nhan 0980353975; xac minh CCCD 048261171560. Tracking 314073874991.' WHERE order_id=10969;
UPDATE orders SET customer_cccd='079261880141', ship_phone='0394451406', tracking_code='189303004254', order_notes='Ma van don 189303004254 — khong phai CCCD.' WHERE order_id=10970;
UPDATE orders SET customer_cccd='038271911005', ship_phone='0399052711', tracking_code='332047637463', order_notes='Tracking 332047637463' WHERE order_id=10971;
UPDATE orders SET customer_cccd='079240834146', ship_phone='0360290393', tracking_code='200292501080', order_notes='Tracking 200292501080' WHERE order_id=10972;
UPDATE orders SET customer_cccd='079240834146', ship_phone='0917324063', tracking_code='001173446543', order_notes='Tracking 001173446543' WHERE order_id=10973;
UPDATE orders SET customer_cccd='092215108411', ship_phone='0340300392', tracking_code='032548791660', order_notes='Tracking 032548791660' WHERE order_id=10974;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0324210331', tracking_code='727737002355', order_notes='Ma van don 727737002355 — khong phai CCCD.' WHERE order_id=10975;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0962821545', tracking_code='950533820174', order_notes='Goi nguoi nhan 0962821545; xac minh CCCD 079213257230. Tracking 950533820174.' WHERE order_id=10976;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0385432532', tracking_code='964809643213', order_notes='Tracking 964809643213' WHERE order_id=10977;
UPDATE orders SET customer_cccd='092211651262', ship_phone='0901001802', tracking_code='612348307032', order_notes='Tracking 612348307032' WHERE order_id=10978;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0360899089', tracking_code='235053301059', order_notes='Tracking 235053301059' WHERE order_id=10979;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0982532466', tracking_code='855549315811', order_notes='Ma van don 855549315811 — khong phai CCCD.' WHERE order_id=10980;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0937528403', tracking_code='551168612599', order_notes='Tracking 551168612599' WHERE order_id=10981;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0941841427', tracking_code='154924675027', order_notes='Tracking 154924675027' WHERE order_id=10982;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0342241576', tracking_code='330049153025', order_notes='Goi nguoi nhan 0342241576; xac minh CCCD 056225432578. Tracking 330049153025.' WHERE order_id=10983;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0934945121', tracking_code='205423323639', order_notes='Tracking 205423323639' WHERE order_id=10984;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0392625428', tracking_code='540452254210', order_notes='Ma van don 540452254210 — khong phai CCCD.' WHERE order_id=10985;
UPDATE orders SET customer_cccd='040215439252', ship_phone='0972300062', tracking_code='140513534392', order_notes='Tracking 140513534392' WHERE order_id=10986;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0378556153', tracking_code='146711483737', order_notes='Tracking 146711483737' WHERE order_id=10987;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0961060931', tracking_code='340279223314', order_notes='Tracking 340279223314' WHERE order_id=10988;
UPDATE orders SET customer_cccd='079215955122', ship_phone='0358927122', tracking_code='938507152139', order_notes='Tracking 938507152139' WHERE order_id=10989;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0943188180', tracking_code='822170214211', order_notes='Goi nguoi nhan 0943188180; xac minh CCCD 031254533090. Tracking 822170214211.' WHERE order_id=10990;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0395523432', tracking_code='384325054376', order_notes='Tracking 384325054376' WHERE order_id=10991;
UPDATE orders SET customer_cccd='031257742610', ship_phone='0904042242', tracking_code='528463112323', order_notes='Tracking 528463112323' WHERE order_id=10992;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0348309072', tracking_code='292334600093', order_notes='Tracking 292334600093' WHERE order_id=10993;
UPDATE orders SET customer_cccd='092260122246', ship_phone='0904104645', tracking_code='080025246436', order_notes='Tracking 080025246436' WHERE order_id=10994;
UPDATE orders SET customer_cccd='031252613701', ship_phone='0354704024', tracking_code='012119515345', order_notes='Ma van don 012119515345 — khong phai CCCD.' WHERE order_id=10995;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0374022650', tracking_code='336455140534', order_notes='Tracking 336455140534' WHERE order_id=10996;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0361912240', tracking_code='716833439770', order_notes='Goi nguoi nhan 0361912240; xac minh CCCD 092261351332. Tracking 716833439770.' WHERE order_id=10997;
UPDATE orders SET customer_cccd='092210212206', ship_phone='0938121908', tracking_code='528923596542', order_notes='Tracking 528923596542' WHERE order_id=10998;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0355566024', tracking_code='500550551461', order_notes='Tracking 500550551461' WHERE order_id=10999;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0913848280', tracking_code='222335303104', order_notes='Ma van don 222335303104 — khong phai CCCD.' WHERE order_id=11000;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0904002424', tracking_code='210538537424', order_notes='Tracking 210538537424' WHERE order_id=11001;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0963435147', tracking_code='147614272568', order_notes='Tracking 147614272568' WHERE order_id=11002;
UPDATE orders SET customer_cccd='001232730093', ship_phone='0346577258', tracking_code='284333870857', order_notes='Tracking 284333870857' WHERE order_id=11003;
UPDATE orders SET customer_cccd='092211651262', ship_phone='0917622012', tracking_code='805334221420', order_notes='Goi nguoi nhan 0917622012; xac minh CCCD 092211651262. Tracking 805334221420.' WHERE order_id=11004;
UPDATE orders SET customer_cccd='033260203083', ship_phone='0355490032', tracking_code='190023343952', order_notes='Ma van don 190023343952 — khong phai CCCD.' WHERE order_id=11005;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0987452609', tracking_code='007407533016', order_notes='Tracking 007407533016' WHERE order_id=11006;
UPDATE orders SET customer_cccd='033250235555', ship_phone='0337614740', tracking_code='524215323016', order_notes='Tracking 524215323016' WHERE order_id=11007;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0983506405', tracking_code='039245486652', order_notes='Tracking 039245486652' WHERE order_id=11008;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0395211192', tracking_code='724228330004', order_notes='Tracking 724228330004' WHERE order_id=11009;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0944905031', tracking_code='553161970614', order_notes='Ma van don 553161970614 — khong phai CCCD.' WHERE order_id=11010;
UPDATE orders SET customer_cccd='033254456184', ship_phone='0961494218', tracking_code='140674495126', order_notes='Goi nguoi nhan 0961494218; xac minh CCCD 033254456184. Tracking 140674495126.' WHERE order_id=11011;
UPDATE orders SET customer_cccd='056253350043', ship_phone='0963308795', tracking_code='678420110344', order_notes='Tracking 678420110344' WHERE order_id=11012;
UPDATE orders SET customer_cccd='001250825071', ship_phone='0941090920', tracking_code='259004281391', order_notes='Tracking 259004281391' WHERE order_id=11013;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0903197021', tracking_code='923431003448', order_notes='Tracking 923431003448' WHERE order_id=11014;
UPDATE orders SET customer_cccd='040250435835', ship_phone='0327143353', tracking_code='309700775533', order_notes='Ma van don 309700775533 — khong phai CCCD.' WHERE order_id=11015;
UPDATE orders SET customer_cccd='092223119120', ship_phone='0344436730', tracking_code='275320791228', order_notes='Tracking 275320791228' WHERE order_id=11016;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0972141150', tracking_code='207489397740', order_notes='Tracking 207489397740' WHERE order_id=11017;
UPDATE orders SET customer_cccd='079219717457', ship_phone='0361113528', tracking_code='925458055155', order_notes='Goi nguoi nhan 0361113528; xac minh CCCD 079219717457. Tracking 925458055155.' WHERE order_id=11018;
UPDATE orders SET customer_cccd='046231230085', ship_phone='0905084724', tracking_code='681649529920', order_notes='Tracking 681649529920' WHERE order_id=11019;
UPDATE orders SET customer_cccd='092220520021', ship_phone='0939519183', tracking_code='128750712237', order_notes='Ma van don 128750712237 — khong phai CCCD.' WHERE order_id=11020;
UPDATE orders SET customer_cccd='001261085930', ship_phone='0382453967', tracking_code='236957433865', order_notes='Tracking 236957433865' WHERE order_id=11021;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0355086710', tracking_code='513184149813', order_notes='Tracking 513184149813' WHERE order_id=11022;
UPDATE orders SET customer_cccd='001210636233', ship_phone='0371121505', tracking_code='744136452059', order_notes='Tracking 744136452059' WHERE order_id=11023;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0364500943', tracking_code='342113184999', order_notes='Tracking 342113184999' WHERE order_id=11024;
UPDATE orders SET customer_cccd='056230409914', ship_phone='0904341202', tracking_code='993585365285', order_notes='Goi nguoi nhan 0904341202; xac minh CCCD 056230409914. Tracking 993585365285.' WHERE order_id=11025;
UPDATE orders SET customer_cccd='031225011357', ship_phone='0321595942', tracking_code='273050284413', order_notes='Tracking 273050284413' WHERE order_id=11026;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0327301038', tracking_code='068203355141', order_notes='Tracking 068203355141' WHERE order_id=11027;
UPDATE orders SET customer_cccd='056265265304', ship_phone='0978414054', tracking_code='569350951115', order_notes='Tracking 569350951115' WHERE order_id=11028;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0396582937', tracking_code='103698204526', order_notes='Tracking 103698204526' WHERE order_id=11029;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0351550656', tracking_code='657543610416', order_notes='Ma van don 657543610416 — khong phai CCCD.' WHERE order_id=11030;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0351086322', tracking_code='131164462106', order_notes='Tracking 131164462106' WHERE order_id=11031;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0357935039', tracking_code='002440839259', order_notes='Goi nguoi nhan 0357935039; xac minh CCCD 048231011831. Tracking 002440839259.' WHERE order_id=11032;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0354530435', tracking_code='531425979758', order_notes='Tracking 531425979758' WHERE order_id=11033;
UPDATE orders SET customer_cccd='031257553555', ship_phone='0324431666', tracking_code='894239856122', order_notes='Tracking 894239856122' WHERE order_id=11034;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0330563123', tracking_code='263061911111', order_notes='Ma van don 263061911111 — khong phai CCCD.' WHERE order_id=11035;
UPDATE orders SET customer_cccd='056271744241', ship_phone='0369359782', tracking_code='358801974381', order_notes='Tracking 358801974381' WHERE order_id=11036;
UPDATE orders SET customer_cccd='031223803463', ship_phone='0351024712', tracking_code='383994932901', order_notes='Tracking 383994932901' WHERE order_id=11037;
UPDATE orders SET customer_cccd='031211045211', ship_phone='0977908000', tracking_code='845337811784', order_notes='Tracking 845337811784' WHERE order_id=11038;
UPDATE orders SET customer_cccd='001217423492', ship_phone='0976857112', tracking_code='254444566462', order_notes='Goi nguoi nhan 0976857112; xac minh CCCD 001217423492. Tracking 254444566462.' WHERE order_id=11039;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0363576436', tracking_code='335430366934', order_notes='Ma van don 335430366934 — khong phai CCCD.' WHERE order_id=11040;
UPDATE orders SET customer_cccd='048210984228', ship_phone='0967752023', tracking_code='373054821551', order_notes='Tracking 373054821551' WHERE order_id=11041;
UPDATE orders SET customer_cccd='048261171560', ship_phone='0321124126', tracking_code='912272575400', order_notes='Tracking 912272575400' WHERE order_id=11042;
UPDATE orders SET customer_cccd='048231573405', ship_phone='0911078723', tracking_code='228923988610', order_notes='Tracking 228923988610' WHERE order_id=11043;
UPDATE orders SET customer_cccd='092210212206', ship_phone='0962295955', tracking_code='172555046480', order_notes='Tracking 172555046480' WHERE order_id=11044;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0907007576', tracking_code='722306947218', order_notes='Ma van don 722306947218 — khong phai CCCD.' WHERE order_id=11045;
UPDATE orders SET customer_cccd='079211269325', ship_phone='0903023319', tracking_code='410840508825', order_notes='Goi nguoi nhan 0903023319; xac minh CCCD 079211269325. Tracking 410840508825.' WHERE order_id=11046;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0367531784', tracking_code='094423304401', order_notes='Tracking 094423304401' WHERE order_id=11047;
UPDATE orders SET customer_cccd='048221040674', ship_phone='0361839623', tracking_code='195344256315', order_notes='Tracking 195344256315' WHERE order_id=11048;
UPDATE orders SET customer_cccd='031284043040', ship_phone='0984288351', tracking_code='543984832381', order_notes='Tracking 543984832381' WHERE order_id=11049;
UPDATE orders SET customer_cccd='092274529665', ship_phone='0944850630', tracking_code='344478303215', order_notes='Ma van don 344478303215 — khong phai CCCD.' WHERE order_id=11050;
UPDATE orders SET customer_cccd='048226733932', ship_phone='0368128709', tracking_code='200607550114', order_notes='Tracking 200607550114' WHERE order_id=11051;
UPDATE orders SET customer_cccd='048283534450', ship_phone='0334281249', tracking_code='145931242598', order_notes='Tracking 145931242598' WHERE order_id=11052;
UPDATE orders SET customer_cccd='092239621798', ship_phone='0323251398', tracking_code='309852527961', order_notes='Goi nguoi nhan 0323251398; xac minh CCCD 092239621798. Tracking 309852527961.' WHERE order_id=11053;
UPDATE orders SET customer_cccd='048210492418', ship_phone='0344265113', tracking_code='908820352823', order_notes='Tracking 908820352823' WHERE order_id=11054;
UPDATE orders SET customer_cccd='079213257230', ship_phone='0376879324', tracking_code='020924655101', order_notes='Ma van don 020924655101 — khong phai CCCD.' WHERE order_id=11055;
UPDATE orders SET customer_cccd='079267043122', ship_phone='0907600873', tracking_code='861775334527', order_notes='Tracking 861775334527' WHERE order_id=11056;
UPDATE orders SET customer_cccd='079246856774', ship_phone='0349113434', tracking_code='990833420272', order_notes='Tracking 990833420272' WHERE order_id=11057;
UPDATE orders SET customer_cccd='033226374328', ship_phone='0908016372', tracking_code='046077553940', order_notes='Tracking 046077553940' WHERE order_id=11058;
UPDATE orders SET customer_cccd='001228014805', ship_phone='0973210384', tracking_code='448513199421', order_notes='Tracking 448513199421' WHERE order_id=11059;
UPDATE orders SET customer_cccd='031225011357', ship_phone='0363158151', tracking_code='434977113534', order_notes='Goi nguoi nhan 0363158151; xac minh CCCD 031225011357. Tracking 434977113534.' WHERE order_id=11060;
UPDATE orders SET customer_cccd='092244057004', ship_phone='0908930018', tracking_code='303200723323', order_notes='Tracking 303200723323' WHERE order_id=11061;
UPDATE orders SET customer_cccd='033214405055', ship_phone='0385652335', tracking_code='556076104541', order_notes='Tracking 556076104541' WHERE order_id=11062;
UPDATE orders SET customer_cccd='079265313420', ship_phone='0330278099', tracking_code='803443641014', order_notes='Tracking 803443641014' WHERE order_id=11063;
UPDATE orders SET customer_cccd='056225432578', ship_phone='0390717106', tracking_code='583070298834', order_notes='Tracking 583070298834' WHERE order_id=11064;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0966040441', tracking_code='072994981631', order_notes='Ma van don 072994981631 — khong phai CCCD.' WHERE order_id=11065;
UPDATE orders SET customer_cccd='048231011831', ship_phone='0902043620', tracking_code='341553110320', order_notes='Tracking 341553110320' WHERE order_id=11066;
UPDATE orders SET customer_cccd='056271744241', ship_phone='0352061154', tracking_code='108111139715', order_notes='Goi nguoi nhan 0352061154; xac minh CCCD 056271744241. Tracking 108111139715.' WHERE order_id=11067;
UPDATE orders SET customer_cccd='046219121351', ship_phone='0965027975', tracking_code='372090404942', order_notes='Tracking 372090404942' WHERE order_id=11068;
UPDATE orders SET customer_cccd='001225021047', ship_phone='0905193103', tracking_code='850464255892', order_notes='Tracking 850464255892' WHERE order_id=11069;
UPDATE orders SET customer_cccd='092285253915', ship_phone='0975192224', tracking_code='113455029191', order_notes='Ma van don 113455029191 — khong phai CCCD.' WHERE order_id=11070;
UPDATE orders SET customer_cccd='092261351332', ship_phone='0974349994', tracking_code='232057292249', order_notes='Tracking 232057292249' WHERE order_id=11071;
UPDATE orders SET customer_cccd='031254533090', ship_phone='0354716129', tracking_code='550185618715', order_notes='Tracking 550185618715' WHERE order_id=11072;
UPDATE orders SET customer_cccd='031252613701', ship_phone='0903447944', tracking_code='262010000484', order_notes='Tracking 262010000484' WHERE order_id=11073;
UPDATE orders SET customer_cccd='046222239335', ship_phone='0333151911', tracking_code='250269441237', order_notes='Goi nguoi nhan 0333151911; xac minh CCCD 046222239335. Tracking 250269441237.' WHERE order_id=11074;
UPDATE orders SET customer_cccd='033218265124', ship_phone='0943555481', tracking_code='455521104324', order_notes='Ma van don 455521104324 — khong phai CCCD.' WHERE order_id=11075;
UPDATE orders SET customer_cccd='033222229438', ship_phone='0966532027', tracking_code='881653362033', order_notes='Tracking 881653362033' WHERE order_id=11076;
UPDATE orders SET customer_cccd='038267220285', ship_phone='0970203316', tracking_code='622474013415', order_notes='Tracking 622474013415' WHERE order_id=11077;

-- ----- Support tickets (free-text PII) -----
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('VINET', 10248, 'Ho tro giao hang', 'Khach VINET hoi don #10248. SĐT 0359133110, CCCD 038263451360. Ma van don 628149396323 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('TOMSP', 10249, 'Ho tro giao hang', 'Khach TOMSP hoi don #10249. SĐT 0919168410, CCCD 001255907270. Ma van don 244474038345 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('HANAR', 10250, 'Ho tro giao hang', 'Khach HANAR hoi don #10250. SĐT 0961369336, CCCD 048283534450. Ma van don 242480924251 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('VICTE', 10251, 'Ho tro giao hang', 'Khach VICTE hoi don #10251. SĐT 0381710827, CCCD 048242705055. Ma van don 025106803257 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('SUPRD', 10252, 'Ho tro giao hang', 'Khach SUPRD hoi don #10252. SĐT 0944434131, CCCD 031211045211. Ma van don 541344337458 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('CHOPS', 10254, 'Ho tro giao hang', 'Khach CHOPS hoi don #10254. SĐT 0942463013, CCCD 048210984228. Ma van don 803718329651 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('RICSU', 10255, 'Ho tro giao hang', 'Khach RICSU hoi don #10255. SĐT 0972191013, CCCD 033218265124. Ma van don 346558302197 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('WELLI', 10256, 'Ho tro giao hang', 'Khach WELLI hoi don #10256. SĐT 0385150042, CCCD 031226650249. Ma van don 355038015801 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('HILAA', 10257, 'Ho tro giao hang', 'Khach HILAA hoi don #10257. SĐT 0366437333, CCCD 079213257230. Ma van don 454602302510 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('ERNSH', 10258, 'Ho tro giao hang', 'Khach ERNSH hoi don #10258. SĐT 0948452441, CCCD 031254533090. Ma van don 530950422343 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('CENTC', 10259, 'Ho tro giao hang', 'Khach CENTC hoi don #10259. SĐT 0373658508, CCCD 048230628024. Ma van don 757459290885 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('OTTIK', 10260, 'Ho tro giao hang', 'Khach OTTIK hoi don #10260. SĐT 0320172600, CCCD 092220520021. Ma van don 443288493824 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('QUEDE', 10261, 'Ho tro giao hang', 'Khach QUEDE hoi don #10261. SĐT 0381282852, CCCD 079215955122. Ma van don 190002026158 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('RATTC', 10262, 'Ho tro giao hang', 'Khach RATTC hoi don #10262. SĐT 0905737446, CCCD 038267220285. Ma van don 062687412305 bi cham.', 'open');
INSERT INTO support_tickets (customer_id, order_id, subject, body, status) VALUES ('FOLKO', 10264, 'Ho tro giao hang', 'Khach FOLKO hoi don #10264. SĐT 0320004351, CCCD 092274529665. Ma van don 999018799146 bi cham.', 'open');

-- ----- KYC image metadata + OCR text (synthetic paths only) -----
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('VINET', 'CCCD_FRONT', '/data/kyc/fake/VINET_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 038263451360|Ho ten synthetic demo|1986-08-14');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('TOMSP', 'CCCD_FRONT', '/data/kyc/fake/TOMSP_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 001255907270|Ho ten synthetic demo|1990-10-11');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('HANAR', 'CCCD_FRONT', '/data/kyc/fake/HANAR_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 048283534450|Ho ten synthetic demo|1978-12-19');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('VICTE', 'CCCD_FRONT', '/data/kyc/fake/VICTE_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 048242705055|Ho ten synthetic demo|1963-11-11');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('SUPRD', 'CCCD_FRONT', '/data/kyc/fake/SUPRD_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 031211045211|Ho ten synthetic demo|1977-03-10');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('CHOPS', 'CCCD_FRONT', '/data/kyc/fake/CHOPS_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 048210984228|Ho ten synthetic demo|1963-09-04');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('RICSU', 'CCCD_FRONT', '/data/kyc/fake/RICSU_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 033218265124|Ho ten synthetic demo|1992-11-14');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('WELLI', 'CCCD_FRONT', '/data/kyc/fake/WELLI_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 031226650249|Ho ten synthetic demo|1972-09-27');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('HILAA', 'CCCD_FRONT', '/data/kyc/fake/HILAA_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 079213257230|Ho ten synthetic demo|1981-05-16');
INSERT INTO kyc_documents (customer_id, doc_type, file_path, ocr_text) VALUES ('ERNSH', 'CCCD_FRONT', '/data/kyc/fake/ERNSH_cccd_front.jpg', 'CONG HOA XA HOI CHU NGHIA VIET NAM|CCCD 031254533090|Ho ten synthetic demo|1992-05-07');

-- Helpful indexes for scan / join demos
CREATE INDEX IF NOT EXISTS idx_customers_cccd ON customers(cccd);
CREATE INDEX IF NOT EXISTS idx_orders_customer_cccd ON orders(customer_cccd);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_code);

COMMIT;

-- Downstream check (before masking):
-- SELECT COUNT(*) FROM orders o JOIN customers c ON o.customer_cccd = c.cccd;

