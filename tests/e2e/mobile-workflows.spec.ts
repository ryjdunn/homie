import { expect, test } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

test("mobile task creation, photos, notes, filters, and completion", async ({ page }, testInfo) => {
  const title = `Take pine branches to the dump ${testInfo.project.name}`;
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Homie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Nada|scheduled or due/ })).toBeVisible();

  await page.getByRole("button", { name: "Add task" }).click();
  const addPanel = page.locator("form.add-panel");
  await addPanel.getByRole("textbox", { name: "Task" }).fill(title);
  await addPanel.getByRole("textbox", { name: "Note" }).fill("Stack is next to the side gate.");
  await addPanel.getByLabel("Category").selectOption("cat_sell_donate");
  await addPanel.getByLabel("For").selectOption("person_ryan");
  await addPanel.getByRole("button", { name: "Urgent" }).click();
  await addPanel.locator('input[type="file"]').nth(1).setInputFiles([
    { name: "branches.png", mimeType: "image/png", buffer: png },
    { name: "pile.png", mimeType: "image/png", buffer: png },
  ]);
  await addPanel.getByRole("button", { name: "Add task", exact: true }).click();

  await expect(addPanel).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  const card = page.getByTestId("task-card").filter({ hasText: title });
  await expect(card).toBeVisible();
  await card.getByRole("button").filter({ hasText: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByPlaceholder("Add a note").fill("Borrow gloves from the garage shelf.");
  await page.getByRole("button", { name: "Send note" }).click();
  await expect(page.getByText("Borrow gloves from the garage shelf.")).toBeVisible();
  await page.getByRole("button", { name: "Close task detail" }).click();

  await expect(page.getByText(title)).toBeVisible();

  await page.getByRole("button", { name: `Complete ${title}` }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText(title)).toBeVisible();
});

test("mobile layout has usable tap targets and no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const addButton = page.getByRole("button", { name: "Add task" });
  const box = await addButton.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(52);
  expect(box?.height).toBeGreaterThanOrEqual(52);
});
