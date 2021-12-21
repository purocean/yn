function Image (img)
  if string.sub(img.src, 1, 1) == '/' then
    img.src = '.' .. img.src
  end
  return img
end
