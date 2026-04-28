import isValidVcsUrl from "./isValidVcsUrl";

describe("isValidVcsUrl", () => {
  test("valid https url returns true", () => {
    expect(isValidVcsUrl("https://github.com/org-name/repo-name")).toBe(true);
  });

  test("valid ssh url returns true", () => {
    expect(isValidVcsUrl("git@github.com:org-name/repo-name.git")).toBe(true);
  });

  test("empty placeholder returns false", () => {
    expect(isValidVcsUrl("empty")).toBe(false);
  });

  test("blank url returns false", () => {
    expect(isValidVcsUrl(" ")).toBe(false);
  });
});
