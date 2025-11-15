import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Page,
  Card,
  TextField,
  Tag,
  Text,
  Button,
  BlockStack,
  Combobox,
  Listbox,
  Layout,
  EmptyState,
} from "@shopify/polaris";
import {
  useLoaderData,
  useNavigation,
  useParams,
  useFetcher,
} from "@remix-run/react";
import { DeleteIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import LoadingSkeleton from "../components/LoadingSkeleton";
import db from "../db.server";

const ProductList = () => {
  const navigation = useNavigation();
  const isPageLoading = navigation.state === "loading";

  if (isPageLoading) {
    return <LoadingSkeleton />;
  }
  const { product_handle } = useParams();
  const fetcher = useFetcher();

  const { product, attributes, groups, metafieldData } = useLoaderData();

  const metafieldDataObject = useMemo(() => {
    if (!metafieldData) return {};
    try {
      return typeof metafieldData === "string"
        ? JSON.parse(metafieldData)
        : metafieldData;
    } catch (error) {
      console.error("Failed to parse metafieldData:", error);
      return {};
    }
  }, [metafieldData]);

  const groupNameToId = useMemo(() => {
    return Object.fromEntries(groups.map((g) => [g.name, g.id]));
  }, [groups]);

  const attributeNameToId = useMemo(() => {
    const map = {};
    attributes.forEach((attr) => {
      map[attr.name] = attr.id;
    });
    return map;
  }, [attributes]);

  const [selectedGroupIds, setSelectedGroupIds] = useState(() => {
    if (!metafieldDataObject || typeof metafieldDataObject !== "object")
      return [];
    const groupIds = Object.keys(metafieldDataObject).map(
      (groupName) => groupNameToId[groupName],
    );
    return groupIds;
  });

  const [attributeValues, setAttributeValues] = useState(() => {
    const values = {};
    if (metafieldDataObject && typeof metafieldDataObject === "object") {
      for (const [groupName, groupAttributes] of Object.entries(
        metafieldDataObject,
      )) {
        for (const [attrName, val] of Object.entries(groupAttributes)) {
          const attrId = attributeNameToId[attrName];
          if (attrId) values[attrId] = val;
        }
      }
    }
    return values;
  });

  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  const groupedAttributes = selectedGroupIds.reduce((acc, groupId) => {
    const groupName = groupMap[groupId];
    acc[groupName] = attributes.filter((attr) =>
      attr.groups.some((g) => g.id === groupId),
    );
    return acc;
  }, {});

  const handleValueChange = (attrId, value) => {
    setAttributeValues((prev) => ({ ...prev, [attrId]: value }));
  };

  const formattedOutput = Object.entries(groupedAttributes).reduce(
    (result, [groupName, attrs]) => {
      const nonEmptyAttrs = {};
      attrs.forEach((attr) => {
        const val = attributeValues[attr.id];
        if (val && val.trim() !== "") {
          nonEmptyAttrs[attr.name] = val;
        }
      });
      if (Object.keys(nonEmptyAttrs).length > 0) {
        result[groupName] = nonEmptyAttrs;
      }
      return result;
    },
    {},
  );

  const initialValues = useMemo(() => {
    const initial = {};
    attributes.forEach((attr) => {
      initial[attr.id] = "";
    });
    return initial;
  }, [attributes]);

  const hasChanges = useMemo(() => {
    return Object.entries(attributeValues).some(
      ([key, val]) => val !== initialValues[key],
    );
  }, [attributeValues, initialValues]);

  useEffect(() => {
    setValue(JSON.stringify(formattedOutput, null, 2));
  }, [formattedOutput]);
  const [value, setValue] = useState(JSON.stringify(formattedOutput, null, 2));
  const [groupErrors, setGroupErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (fetcher.state === "idle") {
      setIsSaving(false);
      if (isSaving) {
        window.shopify.toast.show("Saved successfully");
      }
    }
  }, [fetcher.state]);

  return (
    <Page
      title={product?.title || "Product"}
      backAction={{ content: "Products", url: "/app" }}
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
      <Layout>
        <Layout.Section>
          <Card sectioned>
            {selectedGroupIds.length > 0 ? (
              <div style={{ marginTop: "30px" }}>
                <BlockStack gap="300">
                  {Object.entries(groupedAttributes).map(
                    ([groupName, attrs]) => {
                      const group = groups.find((g) => g.name === groupName);
                      if (!group) return null;

                      return (
                        <Card key={groupName} title={groupName} sectioned>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text variant="headingMd" as="h6">
                              {groupName}
                            </Text>
                            <Button
                              tone="critical"
                              variant="tertiary"
                              size="slim"
                              icon={DeleteIcon}
                              onClick={() => {
                                setSelectedGroupIds((prev) => {
                                  const updatedGroupIds = prev.filter(
                                    (id) => id !== group.id,
                                  );
                                  const attribumetafieldDataObjectoRemove =
                                    attributes
                                      .filter((attr) =>
                                        attr.groups.some(
                                          (g) => g.id === group.id,
                                        ),
                                      )
                                      .map((attr) => attr.id);
                                  setAttributeValues((prevValues) => {
                                    const updatedValues = { ...prevValues };
                                    attribumetafieldDataObjectoRemove.forEach(
                                      (id) => {
                                        delete updatedValues[id];
                                      },
                                    );
                                    return updatedValues;
                                  });
                                  return updatedGroupIds;
                                });
                              }}
                            />
                          </div>
                          <br />
                          <BlockStack gap="200">
                            {attrs.map((attr) => (
                              <TextField
                                key={attr.id}
                                label={attr.name}
                                value={attributeValues[attr.id] || ""}
                                onChange={(val) => {
                                  handleValueChange(attr.id, val);
                                  setGroupErrors((prev) => ({
                                    ...prev,
                                    [groupName]: undefined,
                                  }));
                                }}
                                autoComplete="off"
                              />
                            ))}
                            {groupErrors[groupName] && (
                              <Text tone="critical" variant="bodySm">
                                {groupErrors[groupName]}
                              </Text>
                            )}
                          </BlockStack>
                        </Card>
                      );
                    },
                  )}
                </BlockStack>
              </div>
            ) : (
              <EmptyState
                heading="No groups selected"
                action={{
                  content: "Select groups",
                  onAction: () => {
                    document
                      .querySelector("input[placeholder='Select Groups']")
                      ?.focus();
                  },
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Select one or more groups to start customizing product
                  attributes.
                </p>
              </EmptyState>
            )}
          </Card>
        </Layout.Section>
        <div style={{ width: "350px" }}>
          <Layout.Section variant="oneThird">
            <Card title="Custom Script" sectioned>
              <GroupSelector
                groups={groups}
                selectedGroups={groups.filter((g) =>
                  selectedGroupIds.includes(g.id),
                )}
                onGroupSelect={(selected) =>
                  setSelectedGroupIds(selected.map((g) => g.id))
                }
              />
              <br />
              <div style={{ marginTop: "20px" }}>
                <fetcher.Form
                  method="post"
                  onSubmit={(e) => {
                    const newGroupErrors = {};
                    let isValid = true;

                    Object.entries(groupedAttributes).forEach(
                      ([groupName, attrs]) => {
                        const isGroupEmpty = attrs.every(
                          (attr) =>
                            !attributeValues[attr.id] ||
                            attributeValues[attr.id].trim() === "",
                        );

                        if (isGroupEmpty) {
                          isValid = false;
                          newGroupErrors[groupName] =
                            `At least one attribute in "${groupName}" must be filled.`;
                        }
                      },
                    );

                    if (!isValid) {
                      e.preventDefault();
                      setGroupErrors(newGroupErrors);
                      return;
                    }

                    setGroupErrors({});
                    setIsSaving(true);
                  }}
                >
                  <input
                    type="hidden"
                    name="metafieldData"
                    value={JSON.stringify(formattedOutput)}
                  />
                  <input type="hidden" name="productId" value={product.id} />
                  <Button
                    variant="primary"
                    fullWidth
                    submit
                    loading={isSaving || fetcher.state === "submitting"}
                    disabled={!hasChanges || isSaving || fetcher.state === "submitting"}
                  >
                    Save
                  </Button>
                </fetcher.Form>
              </div>
            </Card>
            <br />
            {selectedGroupIds.length > 0 && (
              <Card>
                <div style={{ marginTop: "0" }}>
                  <TextField
                    label="Generated JSON"
                    value={value}
                    multiline={6}
                    autoComplete="off"
                    onChange={(newVal) => {
                      setValue(newVal);

                      try {
                        const parsed = JSON.parse(newVal);
                        const updatedValues = {};
                        const updatedGroupIds = new Set(selectedGroupIds);
                        const emptyGroups = [];

                        Object.entries(parsed).forEach(
                          ([groupName, groupAttrs]) => {
                            const groupId = groupNameToId[groupName];
                            if (groupId) {
                              if (
                                typeof groupAttrs === "object" &&
                                Object.keys(groupAttrs).length === 0
                              ) {
                                emptyGroups.push(groupName);
                              } else {
                                updatedGroupIds.add(groupId);
                              }

                              Object.entries(groupAttrs).forEach(
                                ([attrName, attrValue]) => {
                                  const attrId = attributeNameToId[attrName];
                                  if (attrId) {
                                    updatedValues[attrId] = attrValue;
                                  }
                                },
                              );
                            }
                          },
                        );

                        if (emptyGroups.length > 0) {
                          setSelectedGroupIds((prev) =>
                            prev.filter(
                              (id) =>
                                !emptyGroups.includes(groupMap[id]) && id !== undefined,
                            ),
                          );
                        } else {
                          setSelectedGroupIds(Array.from(updatedGroupIds));
                        }

                        setAttributeValues((prev) => ({ ...prev, ...updatedValues }));
                      } catch (err) {
                        // invalid JSON; ignore
                      }
                    }}
                  />
                </div>
              </Card>
            )}
          </Layout.Section>
        </div>
      </Layout>
    </Page>
  );
};

export const loader = async ({ request, params }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    let product = null;
    let metafieldData = {};

    if (params.product_handle) {
      const response = await admin.graphql(`
        query {
          productByHandle(handle: "${params.product_handle}") {
            id
            handle
            title
            metafield(namespace: "custom", key: "attribute_config") {
              id
              value
            }
          }
        }
      `);

      const json = await response.json();
      product = json?.data?.productByHandle;

      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
        });
      }

      if (product.metafield?.value) {
        metafieldData = JSON.parse(product.metafield.value);
      }
    }

    const attributes = await db.attributes.findMany({
      where: { shop },
      include: {
        groups: {
          where: { shop },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const groups = await db.groups.findMany({
      where: { shop },
    });

    return new Response(
      JSON.stringify({ product, attributes, groups, metafieldData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in loader:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const productId = formData.get("productId");
  const metafieldData = formData.get("metafieldData");

  try {
    const response = await admin.graphql(`
      mutation {
        metafieldsSet(metafields: [
          {
            namespace: "custom",
            key: "attribute_config",
            type: "json",
            value: ${JSON.stringify(JSON.stringify(metafieldData))},
            ownerId: "${productId}"
          }
        ]) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `);

    const json = await response.json();
    const errors = json?.data?.metafieldsSet?.userErrors;

    if (errors?.length > 0) {
      console.error("Metafield save errors:", errors);
      return new Response(JSON.stringify({ error: errors[0].message }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Metafield save failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
};

export function GroupSelector({
  groups = [],
  onGroupSelect,
  selectedGroups = [],
}) {
  const [selectedGroupIds, setSelectedGroupIds] = useState(
    selectedGroups.map((group) => group.id),
  );
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    setSelectedGroupIds(selectedGroups.map((group) => group.id));
  }, [selectedGroups]);

  const toggleGroupSelection = useCallback(
    (groupId) => {
      setSelectedGroupIds((prevSelected) => {
        const updatedSelection = new Set(prevSelected);
        if (updatedSelection.has(groupId)) {
          updatedSelection.delete(groupId);
        } else {
          updatedSelection.add(groupId);
        }

        const selected = groups.filter((g) => updatedSelection.has(g.id));
        onGroupSelect?.(selected);
        return [...updatedSelection];
      });
    },
    [groups, onGroupSelect],
  );

  const removeGroup = useCallback(
    (groupId) => () => {
      toggleGroupSelection(groupId);
    },
    [toggleGroupSelection],
  );

  const filteredGroups = useMemo(() => {
    if (!searchValue) return groups;
    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [searchValue, groups]);

  const NoGroupsFound = () => {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text as="h3" variant="headingMd">
          No Groups Found
        </Text>
      </div>
    );
  };

  const selectedGroupTags = selectedGroupIds.length > 0 && (
    <Card spacing="extraTight">
      {selectedGroupIds.map((id) => {
        const group = groups.find((g) => g.id === id);
        return group ? (
          <Tag key={group.id} onRemove={removeGroup(group.id)}>
            {group.name}
          </Tag>
        ) : null;
      })}
    </Card>
  );

  return (
    <div>
      <Combobox
        allowMultiple
        activator={
          <Combobox.TextField
            autoComplete="off"
            label="Select Groups"
            labelHidden
            value={searchValue}
            placeholder="Select Groups"
            verticalContent={selectedGroupTags}
            onChange={setSearchValue}
          />
        }
      >
        {filteredGroups.length > 0 ? (
          <Listbox onSelect={toggleGroupSelection}>
            {filteredGroups.map((group) => (
              <Listbox.Option
                key={group.id}
                value={group.id}
                selected={selectedGroupIds.includes(group.id)}
              >
                <Listbox.TextOption
                  selected={selectedGroupIds.includes(group.id)}
                >
                  {group.name}
                </Listbox.TextOption>
              </Listbox.Option>
            ))}
          </Listbox>
        ) : (
          <NoGroupsFound />
        )}
      </Combobox>
    </div>
  );
}

export default ProductList;
