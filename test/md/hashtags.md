# Hashtags Test

This document tests the hashtag/tag syntax supported by Yank Note.

## Basic Hashtags

#YankNote

#Markdown

#Test

## Hashtags with Special Characters

#my-tag

#my_tag

#tag/subtag

## Chinese Hashtags

#笔记

#测试标签

#Yank笔记

## Hashtags in Context

This is a paragraph with a #hashtag in the middle.

Multiple tags: #tag1 #tag2 #tag3

## Hashtags in Lists

- #feature1 First feature
- #feature2 Second feature
- #bug Fix for a bug

## Notes

- Hashtags must be preceded by whitespace or be at the start of a line
- Supported characters: alphanumeric, Chinese characters, `_`, `/`, `-`
- A `#` immediately following text (like C#) is NOT treated as a hashtag
- Example of non-hashtag: This is C# language (no space before #)
