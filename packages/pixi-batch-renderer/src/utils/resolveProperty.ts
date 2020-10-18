import type { DisplayObject } from '@pixi/display';

/**
 * Resolves a dependency property for the passed {@link DisplayObject}. It is expected to evaluate to a
 * number. If the passed {@code prop} is a string, it is dereferenced from the object. If the passed
 * {@code prop} is a function, then it is invoked by passing the object.
 *
 * @ignore
 * @param object - The object for which the dependency property is to be resolved.
 * @param prop - The dependency property that is to be resolved to a numeric value.
 * @param def - The value that will be resolved if {@code prop} is undefined.
 * @return The resolved value of the dependency property {@code prop}.
 */
export function resolveProperty(
    object: DisplayObject, 
    prop: string | number | ((object: DisplayObject) => number),
    def?: number
): number
{
    switch(typeof prop)
    {
        case 'string':
            return object[prop];
        case 'function':
            return prop(object);
        case 'undefined':
            return def;
    }

    return prop;
}