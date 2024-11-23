// File of wrapper functions for Open Library's API
import axios from "axios";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const BASE_URL = "https://openlibrary.org/search.json";

interface BookSearchResult {
  title: string;
  author_name?: string[];
  isbn?: string;        // Watch this, is actually a string[0] but leads to type errors
  first_publish_year?: number;
  author_alternative_name?: string[];
  author_key?: string[];
  cover_edition_key?: string;
  edition_count?: number;
  first_sentence?: string[];
  subject?: string[];
  place?: string[];
  time?: string[];
  person?: string[];
}

interface BookSearchResponse  {
  numFound: number;
  start: number;
  docs: BookSearchResult[];
}

export class OpenLibraryAPI {
    /**
     * Search for books by title.
     * @param title - The title of the book to search for.
     * @returns An array of book metadata (e.g., title, authors, ISBNs, etc.).
     */
    static async bookSearchByTitle(title: string): Promise<BookSearchResult[]> {
      try {
        const response = await axios.get<BookSearchResponse>(BASE_URL, {
          params: { title: title, limit: 1 },
        });
  
        const books = response.data.docs.map((doc) => ({
          title: doc.title,
          author_name: doc.author_name,
          isbn: doc.isbn ? doc.isbn[0] : undefined, // Taking the first ISBN
          first_publish_year: doc.first_publish_year,
          // Newly added keys
          author_alternative_name: doc.author_alternative_name,
          author_key: doc.author_key,
          cover_edition_key: doc.cover_edition_key,
          edition_count: doc.edition_count,
          first_sentence: doc.first_sentence,
          subject: doc.subject,
          place: doc.place,
          time: doc.time,
          person: doc.person,
        }));
  
        return books;
      } catch (error) {
        console.error("Error fetching books:", error);
        throw new Error("Failed to fetch books from OpenLibrary.");
      }
    }
}
