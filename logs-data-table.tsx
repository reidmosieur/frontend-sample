"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// using static data for simplicity
import logsData from "@/data/logs.json";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Filter, SortAsc, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Dispatch,
  Fragment,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ComboboxContent,
  ComboboxProvider,
  ComboboxRoot,
  ComboboxTrigger,
} from "./combobox";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { Separator } from "./ui/separator";

type Logs = typeof logsData | null;
type Log = NonNullable<Logs>[number];
type LogKeys = keyof Log;
const DATA_STATES = ["success", "empty", "loading", "error"] as const;
type DataState = (typeof DATA_STATES)[number];

interface LogsContext {
  // data
  logs: Logs;
  setLogs: Dispatch<SetStateAction<Logs>>;

  // state
  fetchingLogs: boolean;
  setFetchingLogs: Dispatch<SetStateAction<boolean>>;
  dataState: DataState;

  // filters
  userFilter: string | null;
  actionFilter: string | null;
  sortQuery: string | null;

  // pagination
  pages: number;
  page: number;
  itemsPerPage: number;

  // constants that should be provided
  // in context
  uniqueActions: Array<string>;
  uniqueUsers: Array<string>;

  // helpers that need to be defined in a component
  // because of hooks
  addSearchParam: (name: string, value: string) => void;
  removeSearchParam: (names: Array<string>) => void;
}

const LogsContext = createContext<LogsContext>({
  logs: null,
  setLogs: () => {},
  fetchingLogs: true,
  setFetchingLogs: () => {},
  uniqueActions: [],
  uniqueUsers: [],
  userFilter: null,
  actionFilter: null,
  sortQuery: null,
  dataState: "success" as DataState,
  pages: 0,
  page: 0,
  itemsPerPage: 0,
  addSearchParam: () => {},
  removeSearchParam: () => {},
});

// helper function to determine the current sort since it's
// stored in a single searchParam, like this: timestamp:asc
function getSort(sort: string | null) {
  if (!sort) return null;

  const [currentSortKey, currentSortValue] = sort.split(":");

  return { currentSortKey, currentSortValue };
}

function LogsContextProvider({ children }: { children?: ReactNode }) {
  // hook into required data
  const [logs, setLogs] = useState<Logs>(null);
  const [fetchingLogs, setFetchingLogs] = useState(true);
  const [pages, setPages] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // determine how the data should be served to avoid unnecessary work
  const dataStateQuery = searchParams.get("data-state");
  const dataState = (
    dataStateQuery && DATA_STATES.includes(dataStateQuery as DataState)
      ? dataStateQuery
      : "success"
  ) as DataState;

  // these variables get used regardless of data state, for simplicity
  // filter search params
  const userFilter = searchParams.get("user");
  const actionFilter = searchParams.get("action");

  // sort search param
  const sortQuery = searchParams.get("sort");

  // pagination search params
  const itemsPerPage = Number(searchParams.get("items") ?? 10); // hard coded just to use as a default
  const page = Number(searchParams.get("page") ?? 1);

  const simulateSuccessfulFetch = () => {
    // filter the static logsData by requested filters
    const filteredData = logsData.filter(({ user, action }) => {
      const userEqual = user === userFilter;
      const actionEqual = action === actionFilter;

      // using a switch for readability
      switch (true) {
        case !!userFilter && !!actionFilter:
          return userEqual && actionEqual;

        case !!userFilter:
          return userEqual;

        case !!actionFilter:
          return actionEqual;

        case !userFilter && !actionFilter:
          return true;

        default:
          console.error("Unhandled filter state", {
            userFilter,
            actionFilter,
          });
          return true;
      }
    });

    // pagination consts
    // handled here to access filtered data
    const logsLength = filteredData?.length ?? 0;
    const pages = Math.ceil(logsLength / itemsPerPage);
    setPages(pages);

    // sort the filtered data to avoid sorting unnecessary data
    const sort = getSort(sortQuery);
    const currentSortKey = sort?.currentSortKey as unknown as
      | LogKeys
      | undefined;
    const currentSortValue = sort?.currentSortValue;

    // this could be improved with using `localCompare` for strings
    // instead of just `<` but it get's the point across for something
    // this simple
    function compareItemsByCurrentSortKeyValue(a: Log, b: Log) {
      // return early to avoid unnecessary sorting
      if (!currentSortKey) {
        return 0;
      }

      // access the current sort keys value
      const valueA = a[currentSortKey];
      const valueB = b[currentSortKey];

      const aBeforeB = valueA < valueB;

      // check for equality to return early
      return valueA === valueB
        ? 0
        : // if the current sort is ascending, a should
        // come before b
        currentSortValue === "asc" && aBeforeB
        ? -1
        : // if current sort is descending, a should
        // come after b
        currentSortValue === "desc" && !aBeforeB
        ? -1
        : // default to 0 to return an unsorted list
          0;
    }

    // we're fine mutating the original array here since this isn't production
    // data, which would be sorted in the request not the frontend.
    const sortedData = filteredData.sort(compareItemsByCurrentSortKeyValue);

    // paginate the data once's filtered and sorted
    // likwise, to avoid paginating unnecessarily

    const paginatedData = sortedData.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage
    );
    setLogs(paginatedData);
    setFetchingLogs(false);
  };

  const clearState = () => {
    setLogs(null);
    setPages(0);
  };

  // refresh the logs when deps change
  useEffect(() => {
    setTimeout(() => {
      switch (dataState) {
        case "success":
          simulateSuccessfulFetch();
          break;

        // need to handle empty different than clearState
        case "empty":
          setLogs([]);
          setPages(0);
          setFetchingLogs(false);
          break;

        case "loading":
          clearState();
          break;

        case "error":
          clearState();
          setFetchingLogs(false);
          break;
      }
    }, 500); // hard coded just to simulate network latency
    // adding sortedData as a dep causes an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortQuery, userFilter, actionFilter, dataState, page, itemsPerPage]);

  // Get a new searchParams string by merging the current
  // searchParams with a provided key/value pair.
  // differs from removal because, for the most part, you
  // should not need to add a list of params, only remove.
  // this and `removeQueryStrings` would benefit from improved
  // types in a production environment
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  // remove a list of query strings
  const removeQueryStrings = useCallback(
    (names: Array<string>) => {
      const params = new URLSearchParams(searchParams.toString());

      names.map((name) => params.delete(name));

      return params.toString();
    },
    [searchParams]
  );

  const addSearchParam = (name: string, value: string) => {
    router.push(pathname + "?" + createQueryString(name, value));
  };

  const removeSearchParam = (names: Array<string>) => {
    router.push(pathname + "?" + removeQueryStrings(names));
  };

  // create array of unique users
  // this could be constructed anywhere with static data (like this)
  // but establishing it in context mirrors a practical application
  const uniqueUsers = Array.from(new Set(logsData.map(({ user }) => user)));

  // create array of unique actions
  // for the same reason as the uniqueUsers array
  const uniqueActions = Array.from(
    new Set(logsData.map(({ action }) => action))
  );

  return (
    <LogsContext
      value={{
        logs,
        setLogs,
        fetchingLogs,
        setFetchingLogs,
        uniqueActions,
        uniqueUsers,
        userFilter,
        actionFilter,
        sortQuery,
        dataState,
        pages,
        page,
        itemsPerPage,
        addSearchParam,
        removeSearchParam,
      }}
    >
      {children}
    </LogsContext>
  );
}

// ensure LogsContext is only used in a provider
export function useLogsContext() {
  const context = useContext(LogsContext);

  if (context === null)
    throw new Error("useLogsContext must be used within a LogsContextProvider");

  return context;
}

function ActionHead({
  label,
  actions,
}: {
  label: ReactNode;
  actions: ReactNode;
}) {
  return (
    <TableHead>
      <div className="flex gap-4 justify-between">
        {label}
        <div className="flex gap-2 justify-between">{actions}</div>
      </div>
    </TableHead>
  );
}

function LogsTable() {
  const { logs, fetchingLogs, dataState, itemsPerPage } = useLogsContext();

  // header stays the same despite state for UX
  const Header = () => (
    <TableHeader>
      <TableRow>
        <ActionHead
          label="Timestamp"
          actions={<SortButton sortKey="timestamp" />}
        />
        <ActionHead
          label="User"
          actions={
            <Fragment>
              <UserFilterCombobox />
              <SortButton sortKey="user" />
            </Fragment>
          }
        />
        <ActionHead
          label="Action"
          actions={
            <Fragment>
              <ActionFilterCombobox />
              <SortButton sortKey="action" />
            </Fragment>
          }
        />
        <ActionHead
          label="Resource"
          actions={
            <Fragment>
              <SortButton sortKey="resource" />
            </Fragment>
          }
        />
      </TableRow>
    </TableHeader>
  );

  // construct body based
  const LogsBody = () => (
    <Fragment>
      {logs?.map(({ timestamp, user, action, resource }) => (
        <TableRow key={timestamp}>
          <TableCell>{new Date(timestamp).toLocaleString()}</TableCell>
          <TableCell>{user}</TableCell>
          <TableCell>{action}</TableCell>
          <TableCell>{resource}</TableCell>
        </TableRow>
      ))}
    </Fragment>
  );
  const LoadingBody = () => (
    <Fragment>
      {Array.from({ length: itemsPerPage }).map((_, rowIndex) => (
        <TableRow key={`row-${rowIndex}`}>
          {Array.from({ length: 4 }).map((_, cellIndex) => (
            <TableCell key={`row-${rowIndex}-cell-${cellIndex}`}>
              <Skeleton className="w-full h-6" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </Fragment>
  );
  const EmptyBody = () => (
    <TableRow>
      <TableCell colSpan={4}>
        No records found. Please, try changing your filters.
      </TableCell>
    </TableRow>
  );
  const ErrorBody = () => (
    <TableRow>
      <TableCell colSpan={4}>There was an error. Please, try again.</TableCell>
    </TableRow>
  );

  // default to empty body
  let Body = EmptyBody;

  if (fetchingLogs || dataState === "loading") {
    Body = LoadingBody;
  } else {
    switch (dataState) {
      case "success":
        Body = LogsBody;
        break;
      case "error":
        Body = ErrorBody;
        break;
      // no need for "empty" or default since it's already set to EmptyBody
    }
  }

  return (
    <Table className="grow h-full">
      <Header />
      <TableBody>
        <Body />
      </TableBody>
    </Table>
  );
}

function FiltersChips() {
  const { sortQuery, userFilter, actionFilter, removeSearchParam } =
    useLogsContext();

  const FilterChip = ({
    children,
    className,
    ...props
  }: React.ComponentProps<"button">) => (
    <button
      {...props}
      className={cn(
        "text-sm bg-primary text-primary-foreground rounded-full px-3.5 inline-flex gap-3.5 items-center capitalize",
        className
      )}
    >
      {children}
      <X className="size-3.5" />
    </button>
  );

  // functions to remove sort and filters
  const removeSort = () => removeSearchParam(["sort"]);
  const removeUser = () => removeSearchParam(["user"]);
  const removeAction = () => removeSearchParam(["action"]);
  // removing them one at a time rerenders and breaks the function
  const removeAll = () => removeSearchParam(["sort", "user", "action"]);

  const SortChip = () => {
    const descriptionString = sortQuery!.split(":").join(" ");

    return (
      <FilterChip onClick={removeSort}>Sort: {descriptionString}</FilterChip>
    );
  };

  const UserChip = () => {
    return <FilterChip onClick={removeUser}>User: {userFilter}</FilterChip>;
  };

  const ActionChip = () => {
    return (
      <FilterChip onClick={removeAction}>Action: {actionFilter}</FilterChip>
    );
  };

  const RemoveAllChip = () => {
    return <FilterChip onClick={removeAll}>Remove All</FilterChip>;
  };

  return (
    <div className="grid gap-1.5">
      <Label>Filters</Label>
      <div className="flex gap-2">
        {sortQuery ? <SortChip /> : null}
        {userFilter ? <UserChip /> : null}
        {actionFilter ? <ActionChip /> : null}
        {sortQuery || userFilter || actionFilter ? <RemoveAllChip /> : null}
      </div>
    </div>
  );
}

// select to simulate the different types of table state
function DataStateSelect() {
  const { addSearchParam, dataState, setFetchingLogs } = useLogsContext();

  const onValueChange = (value: string) => {
    setFetchingLogs(true);
    addSearchParam("data-state", value);

    switch (value) {
      case "success":
        toast.success("Success", {
          description: "Simulating a successful fetch",
        });
        break;

      case "empty":
        toast.warning("Hmm", {
          description: "Simulating an empty fetch",
        });
        break;

      case "loading":
        toast.message("Just a sec...", {
          description: "Simulating a loading fetch",
        });
        break;

      case "error":
        toast.error("Uh-oh", {
          description: "Simulating an errored fetch",
        });
        break;

      default:
        toast.message("There was an unhandled data type", {
          description: "Did you just override my form? Cheeky",
        });
    }
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="data-state">Data State</Label>
      <Select value={dataState} onValueChange={onValueChange}>
        <SelectTrigger className="w-48 capitalize">
          <SelectValue id="data-state" />
        </SelectTrigger>
        <SelectContent>
          {DATA_STATES.map((value) => (
            <SelectItem key={value} value={value} className="capitalize">
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// applies user filters to the search params
function UserFilterCombobox() {
  const { uniqueUsers, userFilter, addSearchParam, removeSearchParam } =
    useLogsContext();
  const userOptions = uniqueUsers?.map((user) => ({
    label: user,
    value: user,
  }));

  const onValueChange = (newValue: string) =>
    newValue === userFilter
      ? removeSearchParam(["user"])
      : addSearchParam("user", newValue);

  return (
    <ComboboxProvider
      options={userOptions}
      value={userFilter}
      setValue={onValueChange}
    >
      <ComboboxRoot>
        <ComboboxTrigger asChild>
          <button>
            <Filter className="size-4" />
          </button>
        </ComboboxTrigger>
        <ComboboxContent />
      </ComboboxRoot>
    </ComboboxProvider>
  );
}

// applies action filters to the search params
function ActionFilterCombobox() {
  const { uniqueActions, actionFilter, addSearchParam, removeSearchParam } =
    useLogsContext();
  const userOptions = uniqueActions?.map((action) => ({
    label: action,
    value: action,
  }));

  const onValueChange = (newValue: string) =>
    newValue === actionFilter
      ? removeSearchParam(["action"])
      : addSearchParam("action", newValue);

  return (
    <ComboboxProvider
      options={userOptions}
      value={actionFilter}
      setValue={onValueChange}
    >
      <ComboboxRoot>
        <ComboboxTrigger asChild>
          <button>
            <Filter className="size-4" />
          </button>
        </ComboboxTrigger>
        <ComboboxContent />
      </ComboboxRoot>
    </ComboboxProvider>
  );
}

// applies sort to the search params
function SortButton({ sortKey }: { sortKey: string }) {
  const { sortQuery, addSearchParam } = useLogsContext();
  const sort = getSort(sortQuery);

  const currentSortKey = sort?.currentSortKey;
  const currentSortValue = sort?.currentSortValue;
  const currentlySorted = currentSortKey === sortKey ? currentSortValue : null;

  const SortIcon = currentlySorted ? SortAsc : ArrowUpDown;

  // construct new sort value based on current sort value
  // defaults to "asc"
  const onClick = () => {
    const newSortValue = !currentlySorted
      ? "asc"
      : currentSortValue === "asc"
      ? "desc"
      : currentSortValue === "desc"
      ? "asc"
      : "asc";
    const newSort = `${sortKey}:${newSortValue}`;

    addSearchParam("sort", newSort);
  };

  return (
    <button onClick={onClick}>
      <SortIcon
        className={cn(
          "size-4 ease-in-out",
          currentlySorted === "desc"
            ? "transition-transform transform rotate-180"
            : "transition-transform transform"
        )}
      />
    </button>
  );
}

// a simple helper that takes the current and last pages to construct
// pagination with ellipses. delta determines how many numbers around
// the current should be displayed, with ellipses after, then the first
// and last page. 2 is a comfortable number, balancing minimal crowding
// with enough navigation and maintaining a good size across different
// screens.
function createPagination(c: number, m: number) {
  const current = c,
    last = m,
    delta = 2,
    left = current - delta,
    right = current + delta + 1,
    range = [],
    rangeWithDots = [];
  let l;

  for (let i = 1; i <= last; i++) {
    if (i == 1 || i == last || (i >= left && i < right)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push("...");
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
}

function Paginator(props: React.ComponentProps<"nav">) {
  const { pages, page, itemsPerPage, addSearchParam, fetchingLogs } =
    useLogsContext();

  // prevent a UI flash by using a skeleton state
  if (fetchingLogs) {
    return (
      <div className="flex justify-center gap-4 w-full">
        <Skeleton className="w-[100px] h-8" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="size-8" />
        ))}
        <Skeleton className="w-[100px] h-8" />
        <Skeleton className="w-[100px] h-8" />
      </div>
    );
  }

  // there's no need for pagination without any pages
  if (!page || !pages || pages === 0) {
    return null;
  }

  const pagination = createPagination(page, pages);
  // we only want to navigate users if there's a page to go to
  const previousPage = (page > 1 ? page - 1 : page).toString();
  const nextPage = (page < 5 ? page + 1 : page).toString();

  return (
    <Pagination {...props}>
      <PaginationContent className="justify-between">
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={page < 1}
            onClick={() => addSearchParam("page", previousPage)}
          />
        </PaginationItem>
        <div className="order-first flex flex-row flex-wrap items-center justify-center gap-1 md:order-none md:min-w-0">
          {pagination.map((item, index) => (
            <PaginationItem key={`pagination-${index}`}>
              {/* this is why createPagination returns strings and page numbers */}
              {item === "..." ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={page === Number(item)}
                  onClick={() => addSearchParam("page", item.toString())}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
        </div>
        <PaginationItem>
          <PaginationNext onClick={() => addSearchParam("page", nextPage)} />
        </PaginationItem>
        <PaginationItem>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => addSearchParam("items", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// put it all together
export function LogsDataTable() {
  return (
    <LogsContextProvider>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Front-End Sample</h1>
          </CardTitle>
          <CardDescription>
            A simple sample to show my front-end capabilities. Feel free to
            filter, sort, and test different states.
          </CardDescription>
        </CardHeader>
        <Separator orientation="horizontal" />
        <CardContent className="h-full flex flex-col gap-6 justify-between relative">
          <div className="space-y-4">
            <div className="flex gap-8 justify-between">
              <FiltersChips />
              <div className="flex gap-4 items-center">
                <DataStateSelect />
              </div>
            </div>
            <LogsTable />
          </div>
        </CardContent>
        <Separator orientation="horizontal" />
        <CardFooter>
          <Paginator />
        </CardFooter>
      </Card>
    </LogsContextProvider>
  );
}
