import { initializeElem } from "./hexcasting.ts";

import init_renderer, {
  draw_bound_pattern,
  type Color,
  type GridOptions,
  type Intersections,
  type Lines,
  type PatternVariant,
  type Point,
} from "hex_renderer_javascript/hex_renderer_javascript.js";

import wasm from "hex_renderer_javascript/hex_renderer_javascript_bg.wasm?url";
import "./hexcasting.css";

//initializes the WASM code used in the hex_renderer_javascript library
await init_renderer(wasm);

type DrawOptions = (style: CSSStyleDeclaration, palette: string) => GridOptions;

//renders the patterns in a collapsible menu
//It reads the previous data of the images/animation, uses it to draw the new one
//and then it deletes the old
function render_collapsible(
  draw_options: DrawOptions,
  collapsible: Element,
  palette: string,
  class_name: string,
) {
  let patterns = Array.from(collapsible.getElementsByClassName("spell-viz"));
  for (let pat of patterns) {
    let img = pat as HTMLImageElement | HTMLCanvasElement;
    if (img.tagName != "IMG") {
      img = new Image();
      img.setAttribute("data-start", pat.getAttribute("data-start")!);
      img.setAttribute("data-string", pat.getAttribute("data-string")!);
      img.setAttribute("width", pat.getAttribute("width")!);
      img.setAttribute("height", pat.getAttribute("height")!);
      img.setAttribute("data-per-world", pat.getAttribute("data-per-world")!);

      img.innerHTML = pat.innerHTML;

      pat.parentElement?.appendChild(img);
      pat.remove();
    } else {
      img = img as HTMLImageElement;
      URL.revokeObjectURL(img.src);
    }

    img.setAttribute("class", class_name + " pattern-settings spell-viz");

    let per_world = "True" == img.getAttribute("data-per-world");
    let start_dir = img.getAttribute("data-start");
    let pattern_str = img.getAttribute("data-string");
    let width = img.getAttribute("width");
    let height = img.getAttribute("height");

    var pattern: PatternVariant = {
      great_spell: per_world,
      direction: start_dir!,
      angle_sigs: pattern_str!,
    };

    let style = getStyles(img);

    let grid_options = draw_options(style, palette);

    let img_data = draw_bound_pattern(
      grid_options,
      pattern,
      0.35,
      +width!,
      +height!,
    );

    img.src = URL.createObjectURL(
      new Blob([img_data.buffer], { type: "image/png" }),
    );
  }
}

//lazily renders all of the images with the chosen render options
//loads all of the currently open ones and then adds event listeners to open the rest when they're opened
function render_images(
  draw_options: DrawOptions,
  palette: string,
  class_name: string,
) {
  let collapsibles = document.getElementsByClassName("pattern-display");

  for (let collapsible of collapsibles) {
    render_collapsible(draw_options, collapsible, palette, class_name);
  }
}

//loads all of the animated canvas elements back
//also adds an event listener to enable them when their menu is opened
function load_animated() {
  let collapsibles = document.getElementsByClassName("pattern-display");

  for (let collapsible of collapsibles) {
    let patterns = Array.from(collapsible.getElementsByClassName("spell-viz"));

    for (let pattern of patterns) {
      let attr_to_transfer = [
        "data-start",
        "data-string",
        "width",
        "height",
        "data-per-world",
        "class",
      ];
      let canvas = document.createElement("canvas");
      for (const index in attr_to_transfer) {
        const attr = attr_to_transfer[index];
        let value = pattern.getAttribute(attr);
        canvas.setAttribute(attr, value ? value : "");
      }

      canvas.innerHTML = pattern.innerHTML;

      collapsible.appendChild(canvas);

      initializeElem(canvas);

      if (pattern.tagName == "IMG") {
        URL.revokeObjectURL((pattern as HTMLImageElement).src);
      }
      pattern.remove();
    }
  }
}

function parseColor(color: string): Color {
  let trimmed_color = color.trim().substring(1, 7);

  let first = 0;
  let second = 0;
  let third = 0;

  //color is either 12 bits (RGB) or 16 bits (RGBA)
  if (trimmed_color.length == 3 || trimmed_color.length == 4) {
    first = Number("0x" + trimmed_color[0]) * 16;
    second = Number("0x" + trimmed_color[1]) * 16;
    third = Number("0x" + trimmed_color[2]) * 16;
  } else {
    //color is either 24 bits (RGB) or 32 bits (RGBA)
    first = Number("0x" + trimmed_color.substring(0, 2));
    second = Number("0x" + trimmed_color.substring(2, 4));
    third = Number("0x" + trimmed_color.substring(4, 6));
  }

  if (Number.isNaN(first) || Number.isNaN(second) || Number.isNaN(third)) {
    throw new Error("Failed to parse color!");
  }

  return [first, second, third, 255];
}

function getStyles(elem: Element): CSSStyleDeclaration {
  return window.getComputedStyle(elem);
}

function getPalette(style: CSSStyleDeclaration, palette: string): Color[] {
  return style
    .getPropertyValue("--" + palette)
    .split(",")
    .map((row) => parseColor(row.trim()));
}

function generateGridOptions(
  style: CSSStyleDeclaration,
  lines: Lines,
): GridOptions {
  let intersection_point: Point = {
    type: "Single",
    marker: {
      color: parseColor(style.getPropertyValue("--point-color")),
      radius: Number(style.getPropertyValue("--point-outer-radius")),
    },
  };

  let intersections: Intersections = {
    type: "EndsAndMiddle",
    start: {
      type: "BorderedMatch",
      match_radius: Number(style.getPropertyValue("--point-inner-radius")),
      border: intersection_point.marker,
    },
    middle: intersection_point,
    end: {
      type: "Point",
      point: intersection_point,
    },
  };

  return {
    line_thickness: Number(style.getPropertyValue("--line-thickness")),
    center_dot: {
      type: "None",
    },
    pattern_options: {
      type: "Uniform",
      lines: lines,
      intersections: intersections,
    },
  };
}

function generateMonocolor(style: CSSStyleDeclaration, palette: string) {
  let palette_offset = Number(style.getPropertyValue("--palette-offset"));

  let lines: Lines = {
    type: "Monocolor",
    color: getPalette(style, palette)[palette_offset],
    bent: true,
  };

  return generateGridOptions(style, lines);
}

function generateSegment(style: CSSStyleDeclaration, palette: string) {
  let triangle_inner_radius = Number(
    style.getPropertyValue("--triangle-inner-radius"),
  );
  let triangle_outer_radius = Number(
    style.getPropertyValue("--triangle-outer-radius"),
  );
  let triangle_color = parseColor(style.getPropertyValue("--triangle-color"));

  let lines: Lines = {
    type: "SegmentColors",
    colors: getPalette(style, palette),
    triangles: {
      type: "BorderStartMatch",
      match_radius: triangle_inner_radius,
      border: {
        color: triangle_color,
        radius: triangle_outer_radius,
      },
    },
    collisions: {
      type: "ParallelLines",
    },
  };
  return generateGridOptions(style, lines);
}

function generateGradient(style: CSSStyleDeclaration, palette: string) {
  let segs_per_color = Number(style.getPropertyValue("--segs-per-color"));

  let lines: Lines = {
    type: "Gradient",
    colors: getPalette(style, palette),
    bent: true,
    segments_per_color: segs_per_color,
  };

  return generateGridOptions(style, lines);
}

let selected = "animated";

//this is not programmed to accept the Changing pattern option type (it will crash)
//it doesn't make sense in this context (as it's rendering single patterns)
//and it would take more complex color palettes to work properly

let options: Record<string, DrawOptions> = {
  monocolor: generateMonocolor,
  gradient: generateGradient,
  segment: generateSegment,
};

function load_render(name: string) {
  if (name == "animated") {
    if (selected != name) {
      cachedPatternImage = null;
      load_animated();
    }
  } else {
    render_images(options[name], last_palette, name + "-settings");

    //update cached settings to avoid double update
    old_settings = getSettings(name);
  }

  selected = name;
}

function checkEqual(ob1: any, ob2: any) {
  if (ob1 == ob2) {
    return true;
  } else if (ob1 == null || ob2 == null) {
    return false;
  } else if (Object.keys(ob1).length != Object.keys(ob2).length) {
    return false;
  }

  for (let key in ob1) {
    if (!(key in ob2)) {
      return false;
    } else if (typeof ob1[key] != typeof ob2[key]) {
      return false;
    } else if (typeof ob1[key] == "object") {
      if (!checkEqual(ob1[key], ob2[key])) {
        return false;
      }
    } else if (ob1[key] != ob2[key]) {
      return false;
    }
  }
  return true;
}

let cachedPatternImage: HTMLImageElement | null = null;

let old_settings: GridOptions | undefined = undefined;

function getSettings(render_option: string): GridOptions | undefined {
  if (cachedPatternImage == null) {
    cachedPatternImage = document.querySelector("img.spell-viz");
    if (cachedPatternImage == null) return;
  }

  let styles = getStyles(cachedPatternImage);

  return options[render_option](styles, last_palette);
}
function updateRenders() {
  if (selected == "animated") {
    return;
  }

  let new_settings = getSettings(selected);

  if (!checkEqual(new_settings, old_settings)) {
    console.log("updated pattern render from css");

    old_settings = new_settings;

    load_render(selected);
  }
}

//palette values stored via css so they can be changedaround
let palette_options: Record<string, boolean> = {
  default: true,
  turbo: true,
  dark2: true,
  tab10: true,
};

let last_palette = "default";
export function load_palette(name: string) {
  if (!palette_options[name]) {
    return;
  }

  last_palette = name;

  if (selected != "animated") {
    render_images(options[selected], last_palette, selected + "-settings");
  }
}

export const renderers = ["animated", "monocolor", "gradient", "segment"];

export const palettes = ["default", "turbo", "dark2", "tab10"];
//adds all of the options to the menus (renderer and palette menus)
function setup_menus() {
  let render_dropdowns = document.getElementsByClassName("render-dropdowns");

  for (let render_bar of render_dropdowns) {
    for (const entry of renderers) {
      let item = document.createElement("li");
      let button = document.createElement("span");
      button.onclick = () => {
        load_render(entry);
      };
      button.innerText = entry;
      button.className = "render-option";
      item.appendChild(button);
      render_bar?.appendChild(item);
    }
  }

  let palette_dropdowns = document.getElementsByClassName("palette-dropdowns");

  for (let palette_bar of palette_dropdowns) {
    for (const entry of palettes) {
      let item = document.createElement("li");
      let button = document.createElement("span");
      button.onclick = () => {
        load_palette(entry);
      };
      button.innerText = entry;
      button.className = "palette-option";
      item.appendChild(button);
      palette_bar?.appendChild(item);
    }
  }
}

setup_menus();
updateRenders();
