# Image Enhancements Test

This document tests image enhancement features in Yank Note.

## Basic Image

![Basic image](https://via.placeholder.com/300x200)

## Image with Size

### Width and Height

![Sized image](https://via.placeholder.com/300x200 =100x80)

### Width Only (auto height)

![Width only](https://via.placeholder.com/300x200 =150x)

### Percentage Width

![Percentage](https://via.placeholder.com/300x200 =50%x)

## Image with Query Parameters

### Inline Display

![Inline image](https://via.placeholder.com/50?.inline) This text is next to the inline image.

### White Background

![White bg](https://via.placeholder.com/100?.bgw)

### Combined Parameters

![Combined](https://via.placeholder.com/80?.inline?.bgw)

## Image Centering

When a paragraph contains only a single image, it is automatically centered:

![Centered image](https://via.placeholder.com/200x100)

## Image with Attributes

![Styled image](https://via.placeholder.com/200){style="border-radius: 50%;"}

![Bordered image](https://via.placeholder.com/150){.with-border}

![Reduced brightness](https://via.placeholder.com/150){.reduce-brightness}

## Image in Different Contexts

### Image in List

- ![Small](https://via.placeholder.com/30?.inline) Item with image
- ![Small](https://via.placeholder.com/30?.inline) Another item

### Image in Table

| Image | Description |
|-------|-------------|
| ![A](https://via.placeholder.com/50) | First image |
| ![B](https://via.placeholder.com/50) | Second image |

### Image in Blockquote

> ![Quote image](https://via.placeholder.com/100)
> An image inside a blockquote.
