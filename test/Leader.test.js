const Leader = require('../src/Leader');

test('first leader wins election', done => {
    let leader = new Leader({session: {lockdelay: 1}});
    leader.on('elected', () => {
        expect(leader.session.getId()).toBe(leader.key.lastSessionId);
        leader.resign();
        done();
    });
}, 5000);

test('second leader waits', done => {
    let leaderA = new Leader({session: {lockdelay: 1}});
    leaderA.on('elected', () => {
        expect(leaderA.session.getId()).toBe(leaderA.key.lastSessionId);

        let leaderB = new Leader({session: {lockdelay: 1}});
        leaderB.on('elected', () => {
            done.fail("Leader B should not have been elected");
        });

        setTimeout(() => {
            leaderB.resign();
            leaderA.resign();
            done();
        }, 3000);
    });
}, 10000);

test('second leader takes over after first leader resigns', done => {
    let leaderA = new Leader({session: {lockdelay: 1}});
    leaderA.on('elected', async () => {
        expect(leaderA.session.getId()).toBe(leaderA.key.lastSessionId);

        let leaderB = new Leader({session: {lockdelay: 1}});
        leaderB.on('elected', () => {
            expect(leaderB.session.getId()).toBe(leaderB.key.lastSessionId);
            leaderB.resign();
            done();
        });

        leaderA.resign();
    });
}, 10000);
