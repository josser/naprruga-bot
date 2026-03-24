exports.up = async function (knex) {
   await knex.raw(
      `create table chats (
         id integer primary key,
         chat_id integer not null,
         device_id integer not null,
         created_at datetime default current_timestamp
      )`,
   );

   await knex.raw(
      `create table devices (
         id integer primary key,
         sn varchar(15) not null,
         last_on_at datetime default current_timestamp,
         last_off_at datetime default current_timestamp,
         created_at datetime default current_timestamp
      )`,
   );

   await knex.raw(
      `create table voltage_history(
         id integer primary key,
         device_id integer not null,
         voltage float,
         created_at datetime default current_timestamp
      )`
   )
};

exports.down = async function (knex) {
   await knex.schema.dropTable("chats");
   await knex.schema.dropTable("devices");
   await knex.schema.dropTable("voltage_history");
}
