"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.reduxBatch = reduxBatch;
function reduxBatch(next) {

    var nextListeners = [];
    var currentListeners = undefined;

    function ensureCanMutateNextListeners() {

        if (nextListeners === currentListeners) {
            nextListeners = nextListeners.slice();
        }
    }

    function subscribe(listener) {

        if (typeof listener !== "function") throw new Error("Invalid listener, expected a function");

        var isSubscribed = true;

        ensureCanMutateNextListeners();
        nextListeners.push(listener);

        return function unsubscribe() {

            if (!isSubscribed) return;

            ensureCanMutateNextListeners();
            nextListeners.splice(nextListeners.indexOf(listener), 1);

            isSubscribed = false;
        };
    }

    function notifyListeners() {

        var listeners = nextListeners;

        for (var t = 0; t < listeners.length; ++t) {
            currentListeners = listeners;
            listeners[t]();
        }
    }

    return function () {

        var store = next.apply(undefined, arguments);

        var receivedNotification = false;
        var inDispatch = false;

        function dispatchRecurse(action) {

            return Array.isArray(action) ? action.map(function (subAction) {
                return dispatchRecurse(subAction);
            }) : store.dispatch(action);
        }

        function dispatch(action) {

            var reentrant = inDispatch;

            if (!reentrant) {
                receivedNotification = false;
                inDispatch = true;
            }

            var hasError = false;
            var error = undefined;
            var result = undefined;
            try {
                result = dispatchRecurse(action);
            } catch (e) {
                hasError = true;
                error = e;
            }

            var requiresNotification = receivedNotification && !reentrant;

            if (!reentrant) {
                receivedNotification = false;
                inDispatch = false;
            }

            if (requiresNotification) notifyListeners();

            if (hasError) {
                throw error;
            }
            return result;
        }

        store.subscribe(function () {

            if (inDispatch) {
                receivedNotification = true;
            } else {
                notifyListeners();
            }
        });

        return Object.assign({}, store, {
            dispatch: dispatch, subscribe: subscribe
        });
    };
}