`pixi-batch-renderer` is a PixiJS plugin that allows you to add batch rendering to your custom display objects. I have documented each class in the `PIXI.brend` namespace.

# Concepts

[Batch rendering](https://medium.com/swlh/inside-pixijs-batch-rendering-system-fad1b466c420) objects involves aggregating them into groups/batches and rendering them together with one WebGL draw call. PixiJS supports batch rendering its internal display objects - `PIXI.Sprite`, `PIXI.Graphics`, and `PIXI.Mesh`. However, it is difficult to extend that to custom-built display objects; it wasn't designed as an exposable API.

This library builds upon the same concept and is designed for maximum flexibility. It still uses PixiJS's batch system - a stub that enables objects to be rendered asynchronously, without loosing the order of rendering. To understand how it works, understanding these things are helpful:

* Attribute Redirects: An attribute redirect is a data-object that tells `pixi-batch-renderer` how it will transform your object into a set of shader attributes.

* Index Property: If you use indices, this will be property on your display object that holds those indices. It could also be a constant array, rather than a property on each object.

* State Function: A function that generates a `PIXI.State` required to render your objects. It could also be a property on your objects or just `null`, if you want the default state.

* Shader Function: A function that generates a `PIXI.Shader` for rendering batches of objects. You can use `PIXI.brend.ShaderGenerator` to make one instead.

## Additional improvements over PixiJS internal batch rendering

* Texture reduction: If multiple objects in the same batch reference the same texture, it will be uploaded only once. This ensures that the batch sizes are as large as possible.

* Injector functions: Rather than just texture-related macros in the fragment shader/template, `PIXI.brend.ShaderGenerator` allows you to have additional macros and in the vertex shader/template as well.

* Custom uniforms: You can use your own uniforms with `pixi-batch-renderer`, without having to create your own shader generator.

# Regular Batch Renderer Generation

For most use cases, `PIXI.brend.BatchRendererPluginFactory` is all you'll need from this library. You need to do these three things:

1. Generate the plugin class using `PIXI.brend.BatchRendererPluginFactory.from`.

2. Register the plugin with PixiJS's WebGL renderer.

3. Make your custom display object defer its rendering to your plugin.

An example implementation would look like:

```
import * as PIXI from 'pixi.js';
import { AttributeRedirect, BatchRendererPluginFactory, ShaderGenerator } from 'pixi-batch-renderer';

// ExampleFigure has two attributes: aVertex and aTextureCoord. They come from the
// vertices and uvs properties in this object. The indices are in the indices property.
class ExampleFigure extends PIXI.Container
{
  _render(renderer)
  {
    this.vertices = [x0,y0, x1,y1, x2,y2, ..., xn,yn];// variable number of vertices
    this.uvs = [u0,v0, u1,v1, u2, v2, ..., un,yn];// however, all other attributes must have equal length
    this.texture = PIXI.Texture.from("url:example");

    this.indices = [0, 1, 2, ..., n];// we could also tell our batch renderer to not use indices too :)

    renderer.setObjectRenderer(renderer.plugins["ExampleRenderer"]);
    renderer.plugins["ExampleRenderer"].render(this);
  }
}

// Define the geometry of ExampleFigure.
const attribSet = [
  new AttributeRedirect({
      source: "vertices", 
      attrib: "aVertex", 
      type: 'float32', 
      size: 2, 
      glType: PIXI.TYPES.FLOAT, 
      glSize: 2
  }),
  new AttributeRedirect({
      source: "uvs", 
      attrib: "aTextureCoord", 
      type: 'float32', 
      size: 2, 
      glType: PIXI.TYPES.FLOAT, 
      size: 2
  }),
];

// Create a shader function from a shader template!
const shaderFunction = new ShaderGenerator(
// Vertex Shader
`
attribute vec2 aVertex;
attribute vec2 aTextureCoord;
attribute float aTextureId;

varying float vTextureId;
varying vec2 vTextureCoord;

uniform mat3 projectionMatrix;

void main()
{
    gl_Position = vec4((projectionMatrix * vec3(aVertex.xy, 1), 0, 1);
    vTextureId = aTextureId;
    vTextureCoord = aTextureCoord;
}
`,

// Fragment Shader
`
uniform uSamplers[%texturesPerBatch%];/* %texturesPerBatch% is a macro and will become a number */\
varying float vTextureId;
varying vec2 vTextureCoord;

void main(void){
    vec4 color;

    /* get color, which is the pixel in texture uSamplers[vTextureId] @ vTextureCoord */
    for (int k = 0; k < %texturesPerBatch%; ++k)
    {
        if (int(vTextureId) == k)
            color = texture2D(uSamplers[k], vTextureCoord);

    }

    gl_FragColor = color;
}
`,
{}).generateFunction();

// Create batch renderer class
const ExampleRenderer = BatchRendererPluginFactory.from({
    attribSet,
    indexCountProperty: "indices",
    textureProperty: "texture",
    texturePerObject: 1,
    inBatchIdAttrib: "aTextureId", // this will be used to locate the texture in the fragment shader later
    shaderFunction
});

// Remember to do this before instantiating a PIXI.Application or PIXI.Renderer!
PIXI.Renderer.registerPlugin("ExampleRenderer", ExampleRenderer);
```
