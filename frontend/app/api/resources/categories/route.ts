import fs from 'fs'
import path from 'path'

import { NextResponse } from 'next/server'
import matter from 'gray-matter'

const resourcesDirectory = path.join(process.cwd(), 'content', 'resources')

export async function GET() {
  try {
    // Check if directory exists
    if (!fs.existsSync(resourcesDirectory)) {
      return NextResponse.json(['All Resources'])
    }

    const fileNames = fs.readdirSync(resourcesDirectory)
    const categories = new Set<string>()

    fileNames
      .filter(name => name.endsWith('.md'))
      .forEach((name) => {
        const fullPath = path.join(resourcesDirectory, name)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data } = matter(fileContents)
        
        if (data.category) {
          categories.add(data.category)
        } else {
          categories.add('General')
        }
      })

    const sortedCategories = ['All Resources', ...Array.from(categories).sort()]
    return NextResponse.json(sortedCategories)
  } catch (error) {
    console.error('Error reading resource categories:', error)
    return NextResponse.json(['All Resources'])
  }
}