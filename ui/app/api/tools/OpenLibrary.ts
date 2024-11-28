// File of wrapper functions for Open Library's API
import axios from "axios";

const TITLE_URL = "https://openlibrary.org/search.json";
const AUTHOR_URL = "https://openlibrary.org/search/authors.json";

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

interface AuthorSearchResult {
  alternate_names?: string[];
  birth_date?: string;
  key?: string;
  name?: string;
  top_subjects?: string[];
  top_work?: string;
  type?: string;
  work_count?: number;
  ratings_average?: number;
  ratings_sortable?: number;
  ratings_count?: number;
  ratings_count_1?: number;
  ratings_count_2?: number;
  ratings_count_3?: number;
  ratings_count_4?: number;
  ratings_count_5?: number;
  want_to_read_count?: number;
  already_read_count?: number;
  currently_reading_count?: number;
  readinglog_count?: number;
}

interface BookSearchResponse  {
  numFound: number;
  start: number;
  docs: BookSearchResult[];
}
interface AuthorSearchResponse  {
  numFound: number;
  start: number;
  docs: AuthorSearchResult[];
}

export class OpenLibraryAPI {
    /**
     * Search for books by title.
     * @param title - The title of the book to search for.
     * @returns An array of book metadata (e.g., title, authors, ISBNs, etc.).
     */
    static async bookSearchByTitle(title: string): Promise<BookSearchResult[]> {
      console.log("Retrieving book information.")
      try {
        const response = await axios.get<BookSearchResponse>(TITLE_URL, {
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

    /**
     * Search for authors by name.
     * @param name - The title of the book to search for.
     * @returns An array of author metadata.
     */
    static async authorSearchByName(name: string): Promise<AuthorSearchResult[]> {
      console.log("Retrieving author information.")
      try {
        const response = await axios.get<AuthorSearchResponse>(AUTHOR_URL, {
          params: { q: name, limit: 1 },
        });

        const authors = response.data.docs.map((doc) => ({
          // Key-value pairs for each property from the provided data
          alternate_names: doc.alternate_names,
          birth_date: doc.birth_date,
          key: doc.key,
          name: doc.name,
          top_subjects: doc.top_subjects,
          top_work: doc.top_work,
          type: doc.type,
          work_count: doc.work_count,
          ratings_average: doc.ratings_average,
          ratings_sortable: doc.ratings_sortable,
          ratings_count: doc.ratings_count,
          ratings_count_1: doc.ratings_count_1,
          ratings_count_2: doc.ratings_count_2,
          ratings_count_3: doc.ratings_count_3,
          ratings_count_4: doc.ratings_count_4,
          ratings_count_5: doc.ratings_count_5,
          want_to_read_count: doc.want_to_read_count,
          already_read_count: doc.already_read_count,
          currently_reading_count: doc.currently_reading_count,
          readinglog_count: doc.readinglog_count,
        }));

        return authors;
      } catch (error) {
        console.error("Error fetching authors:", error);
        throw new Error("Failed to fetch authors from OpenLibrary.");
      }
  }
}
