import React from 'react';
import {
  Svg,
  Line,
  Polyline,
  Polygon,
  Path,
  Rect,
  Circle,
  Ellipse,
  Text,
  Tspan,
  G,
  Stop,
  Defs,
  ClipPath,
  LinearGradient,
  RadialGradient
} from "@react-pdf/renderer";
import { parse as svgparse } from "svg-parser";

export const SVGRenderer = ({ svgString }) => {
  const svgWithoutPixel = svgString.replaceAll("px", "pt");
  const parsedSVG = svgparse(svgWithoutPixel);

  const convertStylesStringToObject = (stringStyles) => {
    let styles =
      typeof stringStyles === "string" && stringStyles !== undefined
        ? stringStyles
          .replaceAll("&quot;", "'")
          .split(";")
          .reduce((acc, style) => {
            const colonPosition = style.indexOf(":");

            if (colonPosition === -1) return acc;

            const camelCaseProperty = style
                .substr(0, colonPosition)
                .trim()
                .replace(/^-ms-/, "ms-")
                .replace(/-./g, (c) => c.substr(1).toUpperCase()),
              value = style.substr(colonPosition + 1).trim();

            let isSvgStyle = [
              "color",
              "dominantBaseline",
              "fill",
              "fillOpacity",
              "fillRule",
              "opacity",
              "stroke",
              "strokeWidth",
              "strokeOpacity",
              "strokeLinecap",
              "strokeDasharray",
              "transform",
              "textAnchor",
              "visibility"
            ].includes(camelCaseProperty);

            return isSvgStyle && value ? { 
              ...acc, 
              [camelCaseProperty]: value 
            } : acc;
          }, {}) 
        : {};

    return styles;
  };

  /**
   * Rendering logic to convert normal SVG (svgString) to react-pdf compatible SVG
   * **/ 
  const svgToJsx = (obj, index) => {
    let name = obj.type === "element" ? obj.tagName : obj.type;
    let props = { key: index + name };

    if (obj.properties !== undefined) {
      if (obj.properties.style !== undefined) {
        props.style = convertStylesStringToObject(obj.properties.style);
      }
      props = { ...obj.properties, ...props };
    }
    let children =
      obj.children !== undefined ? (
        obj.children.map((c, i) => {
          return svgToJsx(c, index + "-" + i);
        })
      ) : (
        <></>
      );
    if (obj.type === "text") {
      return obj.value;
    }
    if (name === "tspan") {
      let y = props.y ?? 0 + props.dy ?? 0;
      let x = props.x ?? 0 + props.dx ?? 0;
      console.log("tspan", children, y);
      return children.length > 0 ? (
        <Tspan x={x} y={y} key={props.key}>
          {children}
        </Tspan>
      ) : (
        <></>
      );
    }
    if (name === "text") {
      return (
        <Text
          x={props.x ?? 0 + props.dx ?? 0}
          y={props.y ?? 0 + props.dy ?? 0}
          key={props.key}
        >
          {children}
        </Text>
      );
    }
    if (name === "svg") {
      return <Svg {...props}>{children}</Svg>;
    }
    if (name === "path") {
      return <Path {...props}>{children}</Path>;
    }
    if (name === "line") {
      return <Line {...props}>{children}</Line>;
    }
    if (name === "polyline") {
      return <Polyline {...props}>{children}</Polyline>;
    }
    if (name === "polygon") {
      return <Polygon {...props}>{children}</Polygon>;
    }
    if (name === "rect") {
      return <Rect {...props}>{children}</Rect>;
    }
    if (name === "circle") {
      return <Circle {...props}>{children}</Circle>;
    }
    if (name === "ellipse") {
      return <Ellipse {...props}>{children}</Ellipse>;
    }
    if (name === "g") {
      return <G {...props}>{children}</G>;
    }
    if (name === "stop") {
      return <Stop {...props}>{children}</Stop>;
    }
    if (name === "defs") {
      return (
        <>
          {/*<Defs {...props}>
        {obj.children !== undefined
          ? obj.children.map((c, i) => {
              return <></>;// svgToJsx(c, index+"-"+i);
            })
          : undefined}
          </Defs>*/}
        </>
      );
    }
    if (name === "clipPath") {
      return <ClipPath {...props}>{children}</ClipPath>;
    }
    if (name === "linearGradient") {
      return <LinearGradient {...props}>{children}</LinearGradient>;
    }
    if (name === "radialGradient") {
      return <RadialGradient {...props}>{children}</RadialGradient>;
    }
  };

  return <>
    {svgToJsx(parsedSVG.children[0], 0)}
  </>
}
