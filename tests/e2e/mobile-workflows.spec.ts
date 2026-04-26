import { expect, test } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

test("mobile task creation, photos, notes, split, filters, and completion", async ({ page }, testInfo) => {
  const title = `Take pine branches to the dump ${testInfo.project.name}`;
  const childOne = `Load branches ${testInfo.project.name}`;
  const childTwo = `Sweep driveway ${testInfo.project.name}`;
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Homie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /No urgent house stuff|worth seeing now/ })).toBeVisible();

  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Notes").fill("Stack is next to the side gate.");
  await page.getByLabel("Category").selectOption("cat_dump_run");
  await page.getByLabel("Assignee").selectOption("person_ryan");
  await page.getByRole("button", { name: "Urgent" }).click();
  await page.locator('input[type="file"]').nth(1).setInputFiles([
    { name: "branches.png", mimeType: "image/png", buffer: png },
    { name: "pile.png", mimeType: "image/png", buffer: png },
  ]);
  await page.locator("form").getByRole("button", { name: "Add task", exact: true }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByPlaceholder("Add a note").fill("Borrow gloves from the garage shelf.");
  await page.getByRole("button", { name: "Send note" }).click();
  await expect(page.getByText("Borrow gloves from the garage shelf.")).toBeVisible();

  await page.getByPlaceholder("First smaller task\nSecond smaller task").fill(`${childOne}\n${childTwo}`);
  await page.getByRole("button", { name: "Split task" }).click();
  await page.getByRole("button", { name: "Close task detail" }).click();

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByText(childOne)).toBeVisible();
  await expect(page.getByText(childTwo)).toBeVisible();

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
