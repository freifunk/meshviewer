import { NodeFilter } from "./filters/nodefilter";
import { Link, Node, NodeId } from "./utils/node";
import { Moment } from "moment";

export interface CanSetData {
  setData: (data: any) => any;
}

export interface CanFiltersChanged {
  filtersChanged: (filters: Filter[]) => any;
}

export interface NodesByState {
  all: Node[];
  lost: Node[];
  new: Node[];
  online: Node[];
  offline: Node[];
}

export interface ObjectsLinksAndNodes {
  links: Link[];
  nodes: NodesByState;
  nodeDict?: { [k: NodeId]: Node };
  now?: Moment;
  timestamp?: Moment;
}

export interface Filter {
  getKey?: () => string;
  setRefresh(refresh: () => any): any;
  run(data: any): Boolean;
}

export type FilterMethod = (node: Node) => boolean;

export const DataDistributor = function () {
  let targets = [];
  let filterObservers: CanFiltersChanged[] = [];
  let filters: Filter[] = [];
  let filteredData: ObjectsLinksAndNodes;
  let data: ObjectsLinksAndNodes;

  function remove(target: CanSetData) {
    targets = targets.filter(function (currentElement) {
      return target !== currentElement;
    });
  }

  function add(target: CanSetData) {
    targets.push(target);

    if (filteredData !== undefined) {
      target.setData(filteredData);
    }
  }

  function setData(dataValue: ObjectsLinksAndNodes) {
    data = dataValue;
    refresh();
  }

  function refresh() {
    if (data === undefined) {
      return;
    }

    let filter: FilterMethod = filters.reduce(
      function (a: FilterMethod, filter) {
        return function (d: Node): boolean {
          return (a(d) && filter.run(d)).valueOf();
        };
      },
      function () {
        return true;
      },
    );

    filteredData = NodeFilter(filter)(data);

    targets.forEach(function (target) {
      target.setData(filteredData);
    });
  }

  function notifyObservers() {
    filterObservers.forEach(function (fileObserver) {
      fileObserver.filtersChanged(filters);
    });
  }

  function addFilter(filter: Filter) {
    let newItem = true;

    filters.forEach(function (oldFilter: Filter) {
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

  function removeFilter(filter: Filter) {
    filters = filters.filter(function (currentElement) {
      return filter !== currentElement;
    });
    notifyObservers();
    refresh();
  }

  function watchFilters(filterObserver: CanFiltersChanged) {
    filterObservers.push(filterObserver);

    filterObserver.filtersChanged(filters);

    return function () {
      filterObservers = filterObservers.filter(function (currentFilterObserver) {
        return filterObserver !== currentFilterObserver;
      });
    };
  }

  return {
    add,
    remove,
    setData,
    addFilter,
    removeFilter,
    watchFilters,
  };
};
