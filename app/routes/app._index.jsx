import React, { useState, useMemo, useCallback } from "react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  IndexFilters,
  ChoiceList,
  useIndexResourceState,
  useSetIndexFiltersMode,
  Thumbnail,
  Box
} from "@shopify/polaris";
import { useLoaderData, useNavigation, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { ImageIcon } from "@shopify/polaris-icons";

const PAGE_SIZE = 20;

const ProductList = () => {
  const navigation = useNavigation();
  const isPageLoading = navigation.state === "loading";

  if (isPageLoading) {
    return <LoadingSkeleton />;
  }

  const loaderData = useLoaderData();
  const allProducts = loaderData?.products ?? [];

  const [queryValue, setQueryValue] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [views, setViews] = useState(["All", "Active", "Draft", "Archived"]);

  const [selectedViewIndex, setSelectedViewIndex] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode();

  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "Active", value: "ACTIVE" },
            { label: "Draft", value: "DRAFT" },
            { label: "Archived", value: "ARCHIVED" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [];
  if (statusFilter.length > 0) {
    appliedFilters.push({
      key: "status",
      label: `Status: ${statusFilter.join(", ")}`,
      onRemove: () => setStatusFilter([]),
    });
  }

  const handleQueryChange = useCallback((value) => {
    setQueryValue(value);
    setCurrentPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setStatusFilter([]);
    setQueryValue("");
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;
    const selectedView = views[selectedViewIndex];
    if (selectedView !== "All") {
      filtered = filtered.filter(
        (product) => product.status === selectedView.toUpperCase(),
      );
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter((product) =>
        statusFilter.includes(product.status),
      );
    }

    if (queryValue.trim()) {
      filtered = filtered.filter((product) =>
        product.title.toLowerCase().includes(queryValue.toLowerCase()),
      );
    }

    return filtered;
  }, [allProducts, statusFilter, queryValue, selectedViewIndex, views]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const resourceState = useIndexResourceState(paginatedProducts);

  const tabs = views.map((view, index) => ({
    content: view,
    index,
    id: `${view}-${index}`,
    isLocked: index === 0,
  }));

  return (
    <Page
      title="Products"
      secondaryActions={[
        {
          content: "Create Groups",
          url: "/app/groups",
        },
        {
          content: "Create Attributes",
          url: "/app/attributes",
        },
      ]}
    >
      <Card padding={0}>
        <IndexFilters
          queryValue={queryValue}
          queryPlaceholder="Search products"
          onQueryChange={handleQueryChange}
          onQueryClear={() => setQueryValue("")}
          cancelAction={{
            onAction: () => {
              setQueryValue("");
            },
            disabled: false,
          }}
          filters={filters}
          appliedFilters={appliedFilters}
          onClearAll={handleClearAll}
          tabs={tabs}
          selected={selectedViewIndex}
          onSelect={setSelectedViewIndex}
          canCreateNewView={false}
          mode={mode}
          setMode={setMode}
        />

        <IndexTable
          resourceName={{ singular: "product", plural: "products" }}
          itemCount={paginatedProducts.length}
          headings={[
            { title: <div style={{ marginLeft: "50px" }}>Title</div> },
            { title: "Status" },
          ]}
          selectable={false}
          pagination={{
            hasNext: currentPage != totalPages ? true : false,
            hasPrevious: currentPage != 1 ? true : false,
            onNext: () => {
              setCurrentPage((p) => p + 1);
            },
            onPrevious: () => {
              setCurrentPage((p) => p - 1);
            },
          }}
        >
          {paginatedProducts.map(
            ({ id, title, status, handle, featuredImage }, index) => (
              <IndexTable.Row
                id={id}
                key={id}
                selected={resourceState.selectedResources.includes(id)}
                position={index}
              >
                <IndexTable.Cell>
                  <Link
                    to={`/product/${handle}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Thumbnail
                        source={featuredImage?.url || ImageIcon}
                        alt={title}
                        size="small"
                      />
                      <Text as="span" fontWeight="medium">
                        {title}
                      </Text>
                    </div>
                  </Link>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge
                    tone={
                      status === "ACTIVE"
                        ? "success"
                        : status === "DRAFT"
                          ? "warning"
                          : "critical"
                    }
                  >
                    {status.charAt(0).toUpperCase() +
                      status.slice(1).toLowerCase()}
                  </Badge>
                </IndexTable.Cell>
              </IndexTable.Row>
            ),
          )}
        </IndexTable>
      </Card>
      <Box paddingBlockEnd="600" />
    </Page>
  );
};

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const fetchAllProducts = async () => {
    const all = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const query = `
        query {
          products(${cursor ? `after: "${cursor}", ` : ""}first: 100) {
            edges {
              cursor
              node {
                id
                title
                handle
                status
                featuredImage {
                  url
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await admin.graphql(query);
      const json = await response.json();
      const data = json?.data?.products;

      if (!data) break;

      all.push(...data.edges.map((e) => e.node));
      hasNextPage = data.pageInfo.hasNextPage;
      cursor = data.pageInfo.endCursor;
    }

    return all;
  };

  try {
    const products = await fetchAllProducts();
    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    return new Response(JSON.stringify({ products: [] }), {
      status: 500,
    });
  }
};

export default ProductList;
