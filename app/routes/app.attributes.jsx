import {
  Text,
  Card,
  Layout,
  Page,
  BlockStack,
  Button,
  TextField,
  Autocomplete,
  Icon,
  InlineStack,
  EmptyState,
  ResourceList,
  ResourceItem,
  Listbox,
  EmptySearchResult,
  Combobox,
  Tag,
  Banner,
  Link,
} from "@shopify/polaris";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  CheckIcon,
  DeleteIcon,
} from "@shopify/polaris-icons";
import { useLoaderData, useFetcher, useNavigation } from "@remix-run/react";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export default function AttributesPage() {
  const navigation = useNavigation();
  const isPageLoading = navigation.state === "loading";

  if (isPageLoading) {
    return <LoadingSkeleton />;
  }

  const { attributes: initialAttributes = [], groupsloader } = useLoaderData();
  const [attributes, setAttributes] = useState(initialAttributes);
  const [isAddingAttribute, setIsAddingAttribute] = useState(false);
  const [attributeName, setAttributeName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editGroups, setEditGroups] = useState([]);
  const fetcher = useFetcher();

  const [selectedGroups, setSelectedGroups] = useState([]);

  const handleGroupSelection = (groupsloader) => {
    setSelectedGroups(groupsloader);
  };

  const handleEditClick = (id, name, attributeGroups) => {
    setEditingId(id);
    setEditName(name);
    setEditGroups(attributeGroups || []);
    setSelectedGroups(attributeGroups || []);
  };

  const handleSave = (id) => {
    fetcher.submit(
      {
        id,
        name: editName,
        groups: JSON.stringify(selectedGroups),
        action: "update",
      },
      { method: "post" },
    );
    setAttributes(
      attributes.map((attribute) =>
        attribute.id === id
          ? { ...attribute, name: editName, groups: selectedGroups }
          : attribute,
      ),
    );
    setEditingId(null);
  };

  useEffect(() => {
    if (fetcher.data?.attributes) {
      setAttributes(fetcher.data.attributes);
    }
  }, [fetcher.data]);

  return (
    <Page backAction={{ url: "/app" }} title="Attribute">
      <BlockStack gap="500">
        <Card title="Online store dashboard">
          <Text>
            <Banner>
              <p>
                Manage your attribute groups efficiently. You can add, edit, and
                delete groups to better organize your attributes.{" "}
                <Link url="/app/groups">Manage Groups</Link>
              </p>
            </Banner>
          </Text>
        </Card>

        <Card roundedAbove="sm" padding="500">
          <InlineStack align="start" gap="300">
            <div style={{ flexGrow: 1 }}>
              <AutocompleteExample
                attributes={attributes}
                setAttributes={setAttributes}
                allAttributes={initialAttributes}
              />
            </div>
            <Button
              variant="primary"
              icon={PlusIcon}
              onClick={() => setIsAddingAttribute(true)}
            >
              Add Attribute
            </Button>
          </InlineStack>
        </Card>

        {isAddingAttribute && (
          <Card padding="500">
            <BlockStack gap="300">
              <fetcher.Form method="POST">
                <InlineStack gap="300">
                  <div style={{ display: "flex", gap: "10px" }}>
                    <TextField
                      name="name"
                      placeholder="Enter Attribute name"
                      value={attributeName}
                      onChange={(value) => setAttributeName(value)}
                      autoComplete="off"
                    />
                    <GroupSelector
                      groups={groupsloader}
                      onGroupSelect={handleGroupSelection}
                      selectedGroups=""
                    />
                  </div>
                  <input
                    type="hidden"
                    name="groups"
                    value={JSON.stringify(selectedGroups)}
                  />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div>
                      <Button
                        submit
                        variant="primary"
                        disabled={!attributeName.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant="secondary"
                        onClick={() => setIsAddingAttribute(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </InlineStack>
              </fetcher.Form>
            </BlockStack>
          </Card>
        )}

        <Layout gap="500">
          <Layout.Section>
            <Card gap="300">
              {attributes.length > 0 ? (
                <ResourceList
                  resourceName={{
                    singular: "manage attributes",
                    plural: "manage attributes",
                  }}
                  items={attributes}
                  renderItem={(item) => {
                    const { id, name, groups = [] } = item;

                    return (
                      <ResourceItem
                        id={id}
                        persistActions
                        shortcutActions={
                          editingId === id
                            ? null
                            : [
                              {
                                content: (
                                  <Icon source={EditIcon} tone="base" />
                                ),
                                accessibilityLabel: `Edit`,
                                onAction: () =>
                                  handleEditClick(id, name, groups),
                              },
                              {
                                content: (
                                  <Icon source={DeleteIcon} tone="critical" />
                                ),
                                accessibilityLabel: `Delete`,
                                onAction: () =>
                                  fetcher.submit(
                                    { action: "delete", id },
                                    { method: "post" },
                                  ),
                              },
                            ]
                        }
                      >
                        <div style={{ width: "600px" }}>
                          {editingId === id ? (
                            <>
                              <div style={{ paddingBottom: "10px" }}>
                                <Text variant="bodyMd" fontWeight="bold">
                                  {name}
                                </Text>
                              </div>
                              <BlockStack gap="300">
                                <TextField
                                  value={editName}
                                  onChange={(value) => setEditName(value)}
                                  autoComplete="off"
                                />
                                <GroupSelector
                                  groups={groupsloader}
                                  onGroupSelect={handleGroupSelection}
                                  selectedGroups={groups}
                                />
                                <input
                                  type="hidden"
                                  name="groups"
                                  value={JSON.stringify(selectedGroups)}
                                />
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <Button
                                    onClick={() => handleSave(id)}
                                    icon={CheckIcon}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    onClick={() => setEditingId(null)}
                                    variant="secondary"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    icon={DeleteIcon}
                                    tone="critical"
                                    onClick={() =>
                                      fetcher.submit(
                                        { action: "delete", id },
                                        { method: "post" },
                                      )
                                    }
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </BlockStack>
                            </>
                          ) : (
                            <>
                              <div>
                                <div style={{ padding: "5px" }}>
                                  <Text variant="bodyMd" fontWeight="bold">
                                    {name}
                                  </Text>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  {groups.length > 0 &&
                                    groups.map((group) => (
                                      <Tag key={group.id}>{group.name}</Tag>
                                    ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </ResourceItem>
                    );
                  }}
                />
              ) : (
                <EmptyState
                  heading="Manage your attribute attributes"
                  action={{
                    content: "Add Attribute",
                    onAction: () => setIsAddingAttribute(true),
                  }}
                  secondaryAction={{
                    content: "Learn more",
                    url: "https://help.shopify.com",
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Track and add your attribute attributes.</p>
                </EmptyState>
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

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

  const groupsloader = await db.groups.findMany({
    where: { shop },
  });

  return new Response(JSON.stringify({ attributes, groupsloader }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const name = formData.get("name");
  const id = formData.get("id");
  const actionType = formData.get("action");
  const selectedGroups = JSON.parse(formData.get("groups") || "[]");

  try {
    if (actionType === "update") {
      if (!id || !name) {
        return new Response(JSON.stringify({ error: "Invalid data" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const existing = await db.attributes.findFirst({ where: { id, shop } });
      if (!existing) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
        });
      }

      await db.attributes.update({
        where: { id },
        data: {
          name,
          shop,
          groups: {
            set: [],
            connect: selectedGroups.map(({ id }) => ({ id })),
          },
        },
      });
    } else if (actionType === "delete") {
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Attribute ID is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const existing = await db.attributes.findFirst({ where: { id, shop } });
      if (!existing) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
        });
      }

      await db.attributes.delete({ where: { id } });
    } else if (name) {
      await db.attributes.create({
        data: {
          name,
          shop,
          groups: {
            connect: selectedGroups.map(({ id }) => ({ id })),
          },
        },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const attributes = await db.attributes.findMany({
      where: { shop },
      include: {
        groups: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return new Response(JSON.stringify({ attributes }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Database operation failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

function AutocompleteExample({
  attributes = [],
  setAttributes,
  allAttributes,
}) {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);

  const updateText = (value) => {
    setInputValue(value);
    if (!Array.isArray(attributes)) return;

    if (value === "") {
      setAttributes(allAttributes);
    } else {
      setOptions(
        value
          ? attributes
            .filter((attribute) =>
              attribute.name?.toLowerCase().includes(value.toLowerCase()),
            )
            .map((attribute) => ({
              value: attribute.id,
              label: attribute.name,
            }))
          : attributes.map((attribute) => ({
            value: attribute.id,
            label: attribute.name,
          })),
      );
    }
  };

  const handleSelect = (selected) => {
    const selectedAttributes = allAttributes.find(
      (attribute) => attribute.id === selected[0],
    );
    if (selectedAttributes) {
      setAttributes([selectedAttributes]);
      setInputValue(selectedAttributes.name);
    }
  };

  return (
    <Autocomplete
      options={options}
      selected={[]}
      onSelect={handleSelect}
      textField={
        <Autocomplete.TextField
          onChange={updateText}
          value={inputValue}
          prefix={<Icon source={SearchIcon} tone="base" />}
          placeholder="Search"
          autoComplete="off"
        />
      }
    />
  );
}

export function GroupSelector({
  groups = [],
  onGroupSelect,
  selectedGroups = [],
}) {
  const [selectedGroupIds, setSelectedGroupIds] = selectedGroups
    ? useState(selectedGroups.map((group) => group.id))
    : useState([]);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (selectedGroups) {
      setSelectedGroupIds(selectedGroups.map((group) => group.id));
    }
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

        if (onGroupSelect) {
          const selectedGroups = groups.filter((group) =>
            updatedSelection.has(group.id),
          );
          onGroupSelect(selectedGroups);
        }

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

  const selectedGroupTags = selectedGroupIds.length > 0 && (
    <Card spacing="extraTight" alignment="center">
      {selectedGroupIds.map((groupId) => {
        const group = groups.find((g) => g.id === groupId);
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
            placeholder="Search Groups"
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
          <EmptySearchResult title="No Groups Found" />
        )}
      </Combobox>
    </div>
  );
}
