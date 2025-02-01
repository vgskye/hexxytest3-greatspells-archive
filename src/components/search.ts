import Fuse from "fuse.js";
import registryDump from "./registry_dump.json";

const elems = [...document.getElementsByClassName("pattern-entry")];

const searchBar = document.getElementById("search") as HTMLInputElement;
const resultsElem = document.getElementById("results") as HTMLElement;
const valhalla = document.getElementById("valhalla") as HTMLTemplateElement;

const fuseOptions = {
  keys: ["name", "id", "modname"],
};

const fuse = new Fuse(registryDump, fuseOptions);

searchBar.addEventListener("input", () => {
  if (searchBar.value != "") {
    const results = fuse.search(searchBar.value);
    const resultElems = results.map(
      (e) => elems.find((el) => (el as HTMLElement).dataset.id == e.item.id)!,
    );
    resultsElem.replaceChildren(...resultElems);
    const valhallaElems = elems.filter((e) => !resultElems.includes(e));
    valhalla.replaceChildren(...valhallaElems);
  } else {
    resultsElem.replaceChildren(...elems);
    valhalla.replaceChildren();
  }
});
