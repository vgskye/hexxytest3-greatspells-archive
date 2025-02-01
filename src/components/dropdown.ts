let currentlyExpanded: Element | undefined;

function setupDropdown(elem: Element) {
  const button = elem.querySelector(".dropdown-toggle") as HTMLSpanElement;
  button.addEventListener("click", (ev) => {
    if (currentlyExpanded != undefined && currentlyExpanded != elem) {
      closeDropdown();
    }
    if (elem.classList.contains("open")) {
      elem.classList.remove("open");
      button.ariaExpanded = "false";
      currentlyExpanded = undefined;
    } else {
      elem.classList.add("open");
      button.ariaExpanded = "true";
      currentlyExpanded = elem;
      ev.stopPropagation();
    }
  });
}

function closeDropdown() {
  if (currentlyExpanded != undefined) {
    const button = currentlyExpanded.querySelector(
      ".dropdown-toggle",
    ) as HTMLSpanElement;
    button.click();
  }
}

document.querySelectorAll(".pd-dropdown").forEach(setupDropdown);
document.addEventListener("click", closeDropdown);
