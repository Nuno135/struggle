"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { MongoClient } = require('mongodb');
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
class Struggle {
    constructor(options) {
        // if(!options.name) throw new Error('Missing name value');
        if (!options.provider)
            throw new Error('Missing provider value (mongo, postgres, sqlite)');
        this.name = options.name;
        this.dbName = options.name;
        this.host = options.host;
        this.pass = options.host;
        // -------------------------------
        // SELECT/CREATE/DELETE etc
        this.method = null;
        // SELECT {value}
        this.value = null;
        // SELECT {value} from {table}
        this.table = null;
        // SELECT {value} from {table} where {key}
        this.key = null;
        // If method is chainable (CREATE shouldn't include WHERE and stuff like that)
        this.chainable = true;
        // If results should be sorted by column
        this.sort = false;
        // If results should be reversed
        this._reverse = false;
        // If COUNT() should be used
        this._count = false;
        // For Update
        this._update = null;
        // For insert
        this._insert = null;
        // QUERY (RAW)
        this.query = '';
        // -------------------------------
        this.port = options.port;
        this.url = options.url;
        this.provider = options.provider;
        this.db = null;
    }
    async init() {
        switch (this.provider) {
            case 'sqlite': {
                this.db = new sqlite3.Database(this.url, (err) => {
                    if (err)
                        throw new Error(err);
                    return console.log(`Successfully connected to the ${this.url} SQLite database.`);
                });
                break;
            }
            case 'postgres': {
                this.db = new Client({
                    user: this.name || 'postgres',
                    host: this.host || 'localhost',
                    database: this.dbName,
                    password: this.pass,
                    port: this.port
                }).then(err => {
                    if (err)
                        throw new Error(err);
                    this.db.connect();
                    return console.log(`Successfully connected to PostgreSQL database. ${this.host}:${this.port}/${this.dbName}?user=${this.name}&password=${this.pass}`);
                });
                break;
            }
        }
    }
    destroy() {
        switch (this.provider) {
            case 'sqlite': {
                if (this.db == null)
                    throw new Error('Failed to close connection. No database connection exists.');
                this.db.close((err) => {
                    if (err)
                        throw new Error(err);
                    console.log(`Closed database connection.`);
                });
                break;
            }
            case 'postgres': {
                if (this.db === null)
                    throw new Error('Unable to close the connect. No database connection is active.');
                this.db.end();
                return console.log('Database connection has been closed.');
                break;
            }
        }
        return this;
    }
    select(value) {
        if (!value)
            throw new Error('Missing vlaue');
        // If method already exists, return error
        if (this.method != null)
            throw new Error(`Can't SELECT and ${this.method}.`); // No clue how to phrase this
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.method = 'SELECT';
        this.value = value;
        this.chainable = true;
        return this;
    }
    // FROM
    from(table) {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.table = table;
        return this;
    }
    // WHERE statement for SELECT
    where(key) {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.key = key;
        return this;
    }
    // Create database
    create(value) {
        // If method already exists, return error
        if (this.method != null)
            throw new Error(`Can't CREATE and ${this.method}.`); // No clue how to phrase this
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.method = 'CREATE';
        this.value = value;
        this.chainable = false;
        return this;
    }
    drop(value) {
        // Drop tables
        if (this.method != null)
            throw new Error(`Can't DROP and ${this.method}.`); // No clue how to phrase this
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.method = `DROP`;
        this.value = value;
        this.chainable = false;
        return this;
    }
    delete(value) {
        // Delete records in a table
        if (this.method != null)
            throw new Error(`Can't DELETE and ${this.method}.`); // No clue how to phrase this
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.method = `DELETE`;
        this.value = value;
        this.chainable = true;
        return this;
    }
    // Update values (value = tablename)
    update(table) {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.chainable = true;
        this.method = 'UPDATE';
        this.table = table;
        return this;
    }
    // UPDATE DATA (_update)
    set(_update) {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this._update = _update;
        return this;
    }
    // COUNT()
    count() {
        if (this._count)
            throw new Error('Count already activated nub.');
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this._count = true;
        return this;
    }
    // ORDER (ascending | for descending use .reverse() after order)
    order() {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.sort = true;
        return this;
    }
    // Reverse result
    reverse() {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this._reverse = true;
        return this;
    }
    // Insert
    insert(_insert) {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this._insert = _insert;
        this.chainable = true;
        this.method = 'INSERT';
        return this;
    }
    // Insert into
    into(table) {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.table = table;
        return this;
    }
    // Raw function
    raw(query) {
        if (!this.chainable)
            throw new Error(`Lol can't chain`);
        this.chainable = false;
        this.method = 'RAW';
        this.value = query.split(' ')[0];
        this.query = query;
        return this;
    }
    // Run function ( --struggle.select('shit').from('luuul').where({ key: 'AHHH' }).run()-- )
    run() {
        return new Promise(async (resolve, reject) => {
            // Format WHERE in case it exists
            let whereStr = '';
            let updateStr = '';
            let insertColumnStr = '';
            let insertValueStr = '';
            if (this.key == null)
                this.key = {};
            Object.keys(this.key).forEach(i => {
                whereStr += `${i}="${this.key[i]}" AND `;
            });
            if (this._update == null)
                this._update = {};
            Object.keys(this._update).forEach(i => {
                updateStr += `${i}="${this._update[i]}", `;
            });
            if (this._insert == null)
                this._insert = {};
            Object.keys(this._insert).forEach(i => {
                insertColumnStr += `${i}, `;
                insertValueStr += `${typeof (this._insert[i]) == 'string' ? '"' : ''}${this._insert[i]}${typeof (this._insert[i]) == 'string' ? '"' : ''}, `;
            });
            whereStr = whereStr.substring(0, whereStr.length - 5);
            updateStr = updateStr.substring(0, updateStr.length - 2);
            insertColumnStr = insertColumnStr.substring(0, insertColumnStr.length - 2);
            insertValueStr = insertValueStr.substring(0, insertValueStr.length - 2);
            // Switch cases 
            switch (this.method.toLowerCase()) {
                // SELECT
                case 'select': {
                    switch (this.provider) {
                        // SQLite
                        case 'sqlite': {
                            // --------------------------- Will have to make query more complex later
                            // console.log(Object.keys(this.key).length)
                            // console.log(`${this.method} ${this._count ? 'COUNT(' : ''}${this.value}${this._count ? ')' : ''} FROM ${this.table}${Object.keys(this.key).length ? ` WHERE ${whereStr}` : ''}${this.sort === true ? ` ORDER BY ${this.sort}` : ''}`)
                            // Array for results
                            let arr = [];
                            this.db.each(`${this.method} ${this._count ? 'COUNT(' : ''}${this.value}${this._count ? ')' : ''} FROM ${this.table}${Object.keys(this.key).length ? ` WHERE ${whereStr}` : ''}${this.sort === true ? ` ORDER BY ${this.sort}` : ''}`, (err, row) => {
                                if (err)
                                    throw new Error(err);
                                // console.log(row)
                                this.db.each(`${this.method} COUNT(${this.value}) FROM ${this.table}${Object.keys(this.key).length ? ` WHERE ${whereStr}` : ''}${this.sort === true ? ` ORDER BY ${this.sort}` : ''}`, (_err, _row) => {
                                    if (_err)
                                        throw new Error(_err);
                                    // @ts-ignore
                                    // Push all results to the array
                                    arr.push(row);
                                    // Get the value from COUNT()
                                    Object.keys(_row).forEach(i => {
                                        // Compare COUNT() with amount of rows in the array
                                        if (_row[i] === arr.length)
                                            return resolve(arr);
                                    });
                                });
                            });
                            break;
                        }
                    }
                    break; // we're dumb. it works now.
                }
                // CREATE
                case 'create': {
                    switch (this.provider) {
                        // SQLite
                        case 'sqlite': {
                            this.db.run(`${this.method} DATABASE ${this.value};`);
                            break;
                        }
                    }
                    break;
                }
                // DROP
                case 'drop': {
                    switch (this.provider) {
                        // SQLite
                        case 'sqlite': {
                            this.db.run(`${this.method} TABLE ${this.value};`);
                            break;
                        }
                    }
                    break;
                }
                // UPDATE
                case 'update': {
                    switch (this.provider) {
                        case 'sqlite': {
                            // console.log(`${this.method} ${this.value} SET ${updateStr}${this.key != null ? ` WHERE ${whereStr}` : ''}`)
                            this.db.run(`${this.method} ${this.table} SET ${updateStr}${this.key != null ? ` WHERE ${whereStr}` : ''};`);
                            break;
                        }
                    }
                    break;
                }
                // DELETE
                case 'delete': {
                    switch (this.provider) {
                        case 'sqlite': {
                            this.db.run(`${this.method} ${this.value} FROM ${this.table}${this.key != null ? ` WHERE ${whereStr}` : ''};`);
                            break;
                        }
                    }
                    break;
                }
                // INSERT
                case 'insert': {
                    switch (this.provider) {
                        case 'sqlite': {
                            console.log(`INSERT INTO ${this.table} (${insertColumnStr}) VALUES (${insertValueStr});`);
                            this.db.run(`INSERT INTO ${this.table} (${insertColumnStr}) VALUES (${insertValueStr});`);
                            break;
                        }
                    }
                    break;
                }
                // RAW
                case 'raw': {
                    switch (this.provider) {
                        case 'sqlite': {
                            let arr = [];
                            if (this.value.toLowerCase() === 'select') {
                                this.db.each(this.query, (err, row) => {
                                    if (err)
                                        throw new Error(err);
                                    // @ts-ignore
                                    arr.push(row);
                                    //   console.log(arr)
                                });
                                console.log(arr);
                                console.log("nub");
                                //   return resolve(arr);
                            }
                            else {
                                this.db.run(this.query);
                            }
                            break;
                        }
                    }
                }
            }
        });
    }
}
exports.default = Struggle;
module.exports = Struggle;
