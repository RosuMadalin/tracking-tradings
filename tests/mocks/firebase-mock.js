// Fake, in-memory replacement for the Firebase compat SDKs (app/firestore/storage).
// Served in place of the real gstatic.com scripts during tests so no test ever
// touches the real Firestore project or needs network access to Google's CDN.
//
// Supports exactly the surface used by watchlist.js / index.js:
//   db.collection(name).doc(id).set()/.delete()/.get()
//   db.collection(name).get()
//   db.collection(name).where(field, '==', value).orderBy(field, dir).limit(n).get()
// Firestore Timestamps are faked as { toDate() } wrappers around JS Date values,
// matching how a real Date written via .set() comes back as a Timestamp on read.
const FIREBASE_MOCK_SCRIPT = `
(function () {
  var collections = {};

  function getCollection(name) {
    if (!collections[name]) collections[name] = new Map();
    return collections[name];
  }

  function wrapValue(v) {
    if (v instanceof Date) {
      var d = v;
      return { __timestamp: true, toDate: function () { return d; } };
    }
    return v;
  }

  function wrapData(data) {
    var out = {};
    for (var k in data) out[k] = wrapValue(data[k]);
    return out;
  }

  function makeDocSnapshot(id, data) {
    return {
      id: id,
      exists: data !== undefined,
      data: function () { return Object.assign({}, data); },
    };
  }

  function makeQuerySnapshot(entries) {
    return {
      empty: entries.length === 0,
      docs: entries.map(function (e) { return makeDocSnapshot(e[0], e[1]); }),
      forEach: function (fn) {
        entries.forEach(function (e) { fn(makeDocSnapshot(e[0], e[1])); });
      },
    };
  }

  function makeQuery(collectionName, filters, order, limitN) {
    function apply() {
      var entries = Array.from(getCollection(collectionName).entries());
      filters.forEach(function (f) {
        var field = f[0], op = f[1], value = f[2];
        entries = entries.filter(function (e) {
          if (op === '==') return e[1][field] === value;
          return true;
        });
      });
      if (order) {
        var field = order[0], dir = order[1];
        entries.sort(function (a, b) {
          var av = a[1][field], bv = b[1][field];
          var at = av && av.__timestamp ? av.toDate().getTime() : av;
          var bt = bv && bv.__timestamp ? bv.toDate().getTime() : bv;
          return dir === 'desc' ? bt - at : at - bt;
        });
      }
      if (limitN != null) entries = entries.slice(0, limitN);
      return entries;
    }
    return {
      where: function (field, op, value) {
        return makeQuery(collectionName, filters.concat([[field, op, value]]), order, limitN);
      },
      orderBy: function (field, dir) {
        return makeQuery(collectionName, filters, [field, dir || 'asc'], limitN);
      },
      limit: function (n) {
        return makeQuery(collectionName, filters, order, n);
      },
      get: function () {
        return Promise.resolve(makeQuerySnapshot(apply()));
      },
    };
  }

  function makeCollection(name) {
    var base = makeQuery(name, [], null, null);
    base.doc = function (id) {
      return {
        set: function (data) {
          getCollection(name).set(id, wrapData(data));
          return Promise.resolve();
        },
        delete: function () {
          getCollection(name)['delete'](id);
          return Promise.resolve();
        },
        get: function () {
          var data = getCollection(name).get(id);
          return Promise.resolve(makeDocSnapshot(id, data));
        },
      };
    };
    return base;
  }

  window.firebase = {
    initializeApp: function () {},
    firestore: function () {
      return { collection: makeCollection };
    },
    storage: function () {
      return {};
    },
  };

  // Test-only hook to seed fixture data before the app scripts run their onload logic.
  window.__seedFirestore = function (collectionName, id, data) {
    getCollection(collectionName).set(id, wrapData(data));
  };

  // Picked up from an addInitScript call made before navigation, so seed data is
  // already in place before watchlist.js / index.js run their DOMContentLoaded/onload logic.
  if (window.__firestoreSeed) {
    window.__firestoreSeed.forEach(function (s) {
      getCollection(s.collection).set(s.id, wrapData(s.data));
    });
  }
})();
`;

const FIREBASE_NOOP_SCRIPT = '// no-op: real script already provided by firebase-app-compat.js mock';

module.exports = { FIREBASE_MOCK_SCRIPT, FIREBASE_NOOP_SCRIPT };
