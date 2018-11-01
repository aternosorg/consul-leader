const _ = require('lodash');

let defaultOptions = {
    dc: "",
    ttl: 10,
    lockdelay: 15,
    id: false
};

/**
 * Sessions act as a binding layer between nodes, health checks and key/value data
 *
 * https://www.consul.io/docs/internals/sessions.html
 */
class Session {
    /**
     * Constructor
     *
     * @param consul https://www.npmjs.com/package/consul#consuloptions
     * @param options https://www.npmjs.com/package/consul#consulsessioncreateoptions-callback
     */
    constructor(consul, options) {
        this.renewInterval = null;
        this.consul = consul;
        this.options = _.defaultsDeep(options, defaultOptions);
    }

    /**
     * Create a session
     *
     * @returns {Promise<void>}
     */
    async create() {
        // convert int second options to strings for consul
        let stringOptions = _.defaultsDeep({
            ttl: this.options.ttl + "s",
            lockdelay: this.options.lockdelay + "s"
        }, this.options);

        let result = await this.consul.session.create(stringOptions);
        if (result && typeof result.ID !== "undefined") {
            this.options.id = result.ID;

            let self = this;
            this.renewInterval = setInterval(() => {
                self.renew();
            }, this.options.ttl / 2);
        }
    }

    /**
     * Renew the session
     *
     * @returns {Promise<void>}
     */
    async renew() {
        await this.consul.session.renew({id: this.options.id, dc: this.options.dc});
    }

    /**
     * Destroy the session
     *
     * @returns {Promise<void>}
     */
    async destroy() {
        clearInterval(this.renewInterval);
        await this.consul.session.destroy({id: this.options.id, dc: this.options.dc});
    }

    /**
     * Get the current session ID
     *
     * @returns null|string
     */
    getId() {
        return this.options.id;
    }
}

module.exports = Session;