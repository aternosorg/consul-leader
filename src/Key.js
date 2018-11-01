const EventEmitter = require('events');
const _ = require('lodash');
const Session = require('./Session');

let defaultOptions = {
    key: "consul-leader/lock",
    value: "leader"
};

/**
 * A key in the key value store can be used to save values,
 * but also to acquire and release locks for distributed locking
 *
 * https://www.consul.io/docs/commands/kv.html
 *
 * Emits events, can emit multiple events on one change:
 * acquired: key lock was acquired by current session
 * lost: key lock was lost by current session
 * released: key lock is released and can be acquired
 * taken: key lock was acquired
 */
class Key extends EventEmitter {
    /**
     * Constructor
     *
     * @param consul https://www.npmjs.com/package/consul#consuloptions
     * @param options https://www.npmjs.com/package/consul#consulkvsetoptions-callback
     * @param session
     */
    constructor(consul, options, session) {
        super();

        this.locked = false;
        this.lastSessionId = null;
        this.consul = consul;
        this.options = _.defaultsDeep(options, defaultOptions);

        if (typeof session === "undefined") {
            session = new Session();
        }
        this.session = session;

        this.startWatching();
    }

    /**
     * Acquire the lock on a key
     *
     * @returns {Promise<*>}
     */
    async acquire() {
        if (!this.session.getId()) {
            await this.session.create();
        }

        let acquireOptions = _.defaultsDeep({acquire: this.session.getId()}, this.options);
        return await this.consul.kv.set(acquireOptions);
    }

    /**
     * Release the lock on a key
     *
     * @returns {Promise<*>}
     */
    async release() {
        if (!this.session.getId()) {
            await this.session.create();
        }

        let releaseOptions = _.defaultsDeep({release: this.session.getId()}, this.options);
        return await this.consul.kv.set(releaseOptions);
    }

    /**
     * Start consul watch for key changes,
     * see class comment for event details
     */
    async startWatching() {
        let self = this;
        if (!this.session.getId()) {
            await this.session.create();
        }
        this.watch = this.consul.watch({method: this.consul.kv.get, options: this.options});
        this.watch.on('change', function (data) {
            if (!data) {
                data = {};
            }

            if (typeof data.Session === "undefined") {
                data.Session = false;
            }

            // no change, don't emit events
            if (data.Session === this.lastSessionId) {
                return;
            }

            self.lastSessionId = data.Session;

            // lock was released and is free
            if (data.Session === false) {
                self.emit('released', self);
            }

            // lock was taken from someone
            if (data.Session !== false) {
                self.emit('taken', self);
            }

            // lock is not acquired by current session anymore
            if (self.locked && data.Session !== self.session.getId()) {
                self.locked = false;
                self.emit('lost', self);
            }

            // lock is now acquired by current session
            if (!self.locked && data.Session === self.session.getId()) {
                self.locked = true;
                self.emit('acquired', self);
            }

        });

        this.watch.on('error', function (error) {
            console.error(error);
        })
    }

    /**
     * Stop the consul watch
     */
    stopWatching() {
        this.watch.end();
    }
}

module.exports = Key;