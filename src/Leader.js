const _ = require('lodash');
const EventEmitter = require('events');
const Session = require('./Session');
const Key = require('./Key');
const consul = require('consul');

let defaultOptions = {
    consul: { // see https://www.npmjs.com/package/consul#consuloptions
        promisify: true // required!
    },
    session: {}, // see Session.js
    key: {} // see Key.js
};

/**
 * The leader election in consul is based on the sessions API
 *
 * https://www.consul.io/docs/guides/leader-election.html
 *
 * Emits events:
 * elected: Leader was elected, start working
 * retired: Lost the leadership, resign, stop all work immediately
 */
class Leader extends EventEmitter {
    /**
     * Constructor
     *
     * @param options
     */
    constructor(options) {
        super();
        if (typeof(options) === "string") {
            options = {key: {key: options}};
        }

        this.options = _.defaultsDeep(options, defaultOptions);

        this.consul = consul(this.options.consul);
        this.session = new Session(this.consul, this.options.session);
        this.key = new Key(this.consul, this.options.key, this.session);

        this.runForOffice();
    }

    /**
     * Listen on the key events (one is emitted at start)
     * and try to run for office or pass events on
     */
    runForOffice() {
        let self = this;
        this.key.on('released', () => {
            setTimeout(() => {
                self.key.acquire()
            }, self.session.options.lockdelay * 1000);
        });

        this.key.on('acquired', () => {
            self.emit('elected', self);
        });

        this.key.on('lost', () => {
            self.emit('retired', self);
        });
    }

    /**
     * Resign from leadership, release locks and destroy session
     */
    async resign() {
        await Promise.all([
            this.key.release(),
            this.key.stopWatching(),
            this.session.destroy(),
        ]);
    }
}

module.exports = Leader;