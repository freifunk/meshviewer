import { NodeFilter } from "./filters/nodefilter";

export const DataDistributor = function () {
  var targets = [];
  var filterObservers = [];
  var filters = [];
  var filteredData;
  var data;

  function remove(target) {
    targets = targets.filter(function (currentElement) {
      return target !== currentElement;
    });
  }

  function add(target) {
    targets.push(target);

    if (filteredData !== undefined) {
      target.setData(filteredData);
    }
  }

  function setData(dataValue) {
    data = dataValue;
    refresh();
  }

  function refresh() {
    if (data === undefined) {
      return;
    }

    var filter = filters.reduce(
      function (a, filter) {
        return function (d) {
          return a(d) && filter.run(d);
        };
      },
      function () {
        return true;
      },
    );

    filteredData = new NodeFilter(filter)(data);

    targets.forEach(function (target) {
      target.setData(filteredData);
    });
  }

  function notifyObservers() {
    filterObservers.forEach(function (fileObserver) {
      fileObserver.filtersChanged(filters);
    });
  }

  function addFilter(filter) {
    var newItem = true;

    filters.forEach(function (oldFilter) {
      if (oldFilter.getKey && oldFilter.getKey() === filter.getKey()) {
        removeFilter(oldFilter);
        newItem = false;
      }
    });

    if (newItem) {
      filters.push(filter);
      notifyObservers();
      filter.setRefresh(refresh);
      refresh();
    }
  }

  function removeFilter(filter) {
    filters = filters.filter(function (currentElement) {
      return filter !== currentElement;
    });
    notifyObservers();
    refresh();
  }

  function watchFilters(filterObserver) {
    filterObservers.push(filterObserver);

    filterObserver.filtersChanged(filters);

    return function () {
      filterObservers = filterObservers.filter(function (currentFilterObserver) {
        return filterObserver !== currentFilterObserver;
      });
    };
  }

  return {
    add: add,
    remove: remove,
    setData: setData,
    addFilter: addFilter,
    removeFilter: removeFilter,
    watchFilters: watchFilters,
  };
};
