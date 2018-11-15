# consul-leader

Consul leader election and retirement.

https://www.consul.io/docs/guides/leader-election.html

## Usage

```
npm install --save consul-leader
```

```javascript
const Leader = require('consul-leader');

let consulLeader = new Leader('locking-key');
consulLeader.on('elected', () => {
    // start service
});

consulLeader.on('retired', () => {
    // stop service
});
```

## Leader

### Configuration
No configuration is required, but it's recommended to provide at least a custom key name.
```javascript
let consulLeader = new Leader('locking-key');
```

It's possible to configure every aspect (consul, session, key) by providing a configuration object
instead of a plain string. Most aspects match the configuration options of the [consul](https://www.npmjs.com/package/consul) package.
```javascript
let consulLeader = new Leader({
    consul: {
        host: '127.0.0.1',
        port: 8500
    },
    session: {
        ttl: 10,
        lockdelay: 15
    },
    key: {
        key: 'locking-key',
        value: 'leader'
    }
});
```
The `consul` configuration matches the [consul constructor options](https://www.npmjs.com/package/consul#consuloptions). 
Note: the `promisify` option is required and will be automatically enabled in this package.

The `session` configuration matches the [consul session create options](https://www.npmjs.com/package/consul#consulsessioncreateoptions-callback).
But the `ttl` and `lockdelay` options have to be integers in seconds.

The `key` configuration matches the [consul kv set options](https://www.npmjs.com/package/consul#consulkvsetoptions-callback). 
The `acquire` and `release` options are automatically added, overwriting them will lead to unexpected behaviour.

### Events
The `Leader` class will automatically try to acquire the leader lock and emits two different events:
* `elected`: Will be fired when the current instance has acquired the leader lock successfully
* `retired`: Will be fired when the current instance has lost the leader lock

```javascript
consulLeader.on('elected', () => {
    // start service
});

consulLeader.on('retired', () => {
    // stop service
});
```

### Resign
If the current instance wants to stop, it can release the lock safely and give others the chance to take over.
```javascript
consulLeader.resign();
```