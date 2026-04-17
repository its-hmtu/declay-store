create table users(
	id SERIAL primary key,
	username varchar(255) unique not null,
	email varchar(255) unique not null,
	full_name varchar(255),
	phone_number varchar(255),
	is_email_verified boolean,
	created_at timestamp default CURRENT_TIMESTAMP,
	updated_at timestamp default CURRENT_TIMESTAMP
);

create table admins(
	id SERIAL primary key,
	username varchar(255) unique not null,
	email varchar(255) unique not null,
	full_name varchar(255),
	created_at timestamp default CURRENT_TIMESTAMP,
	updated_at timestamp default CURRENT_TIMESTAMP
);

create table roles(
	id SERIAL primary key,
	name varchar(255) not null
);

alter table admins
add column role_id int references roles(id);

create table addresses(
	id SERIAL primary key,
	user_id int references users(id) on delete cascade,
	receiver_name varchar(255) not null,
	receiver_phone varchar(20) not null,
	street text not null,
	ward varchar(100),
	district varchar(100),
	city varchar(100),
	country varchar(100) default 'Vietnam',
	is_default boolean default false,
	address_type varchar(20) default 'home',
	created_at timestamptz default CURRENT_TIMESTAMP,
	updated_at timestamptz default CURRENT_TIMESTAMP
);

create unique index unique_default_address
on addresses(user_id)
where is_default = true;

create index idx_addresses_user_id on addresses(user_id);
create index idx_users_id on users(id);
create index idx_admins_id on admins(id);

/* -- products -- */

create table products(
	id SERIAL primary key,
	name varchar(255) not null,
	short_name varchar(255),
	description TEXT not null,
	base_price numeric(10, 2),
	created_at timestamptz default CURRENT_TIMESTAMP
);

create table categories(
	id SERIAL primary key,
	name varchar(255) not null,
	parent_id int references categories(id)
);

create table products_categories(
	product_id int references products(id) on delete cascade,
	category_id int references categories(id) on delete cascade,
	primary key(product_id, category_id)
);
create table product_options (
	id SERIAL primary key,
	product_id int references products(id) on delete cascade,
	name varchar(100)
);

create table product_option_values (
	id SERIAL primary key,
	option_id int references product_options(id) on delete cascade,
	value varchar(100)
);
create table product_variants (
	id SERIAL primary key,
	product_id int references products(id) on delete cascade,
	sku varchar(100) unique,
	price numeric(10, 2),
	stock int,
	created_at timestamptz default CURRENT_TIMESTAMP
);
create table variant_option_values (
	variant_id int references product_variants(id) on delete cascade,
	option_value_id int references product_option_values(id) on delete cascade,
	primary key (variant_id, option_value_id)
);
create index idx_variants_product_id on product_variants(product_id);
create index idx_option_product_id on product_options(product_id);

create table wishlists(
	user_id int references users(id) on delete cascade,
	product_id int references products(id) on delete cascade,
	primary key(user_id, product_id)
);

/* -- cart -- */
create table carts(
	id SERIAL primary key,
	user_id int unique references users(id) on delete cascade
);

create table cart_items(
	id SERIAL primary key,
	cart_id int references carts(id) on delete cascade,
	product_id int references products(id),
	quantity int not null
);