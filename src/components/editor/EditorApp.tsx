import Editor, { loader, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildStarterId,
  defaultStarterForWeek,
  findStarter,
  findStarterById,
  normalizeWeek,
  starters,
  startersByWeek,
  type StarterFile,
} from "../../lib/starters";
import { loadSavedFiles, resetCode, saveFiles } from "../../lib/storage";
import { runCode } from "../../lib/runClient";

// Declare global csharpWorker interface for WASM-based IntelliSense
declare global {
  interface Window {
    csharpWorker?: {
      getCompletions: (code: string, position: { lineNumber: number; column: number }) => Promise<any[]>;
    };
  }
}

// C# keyword completions for basic IntelliSense
const CSHARP_KEYWORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked',
  'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else',
  'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for',
  'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock',
  'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params',
  'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short',
  'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual',
  'void', 'volatile', 'while', 'var', 'async', 'await', 'dynamic', 'nameof', 'record'
];

// System namespace classes
const SYSTEM_NAMESPACE_CLASSES = [
  { name: 'Console', detail: 'class System.Console', documentation: 'Represents the standard input, output, and error streams.' },
  { name: 'String', detail: 'class System.String', documentation: 'Represents text as a sequence of UTF-16 code units.' },
  { name: 'Math', detail: 'static class System.Math', documentation: 'Provides constants and static methods for trigonometric, logarithmic, and other common mathematical functions.' },
  { name: 'Convert', detail: 'static class System.Convert', documentation: 'Converts a base data type to another base data type.' },
  { name: 'DateTime', detail: 'struct System.DateTime', documentation: 'Represents an instant in time, typically expressed as a date and time of day.' },
  { name: 'Random', detail: 'class System.Random', documentation: 'Represents a pseudo-random number generator.' },
  { name: 'Environment', detail: 'static class System.Environment', documentation: 'Provides information about, and means to manipulate, the current environment.' },
  { name: 'Array', detail: 'class System.Array', documentation: 'Provides methods for creating, manipulating, searching, and sorting arrays.' },
  { name: 'Object', detail: 'class System.Object', documentation: 'Supports all classes in the .NET class hierarchy.' },
  { name: 'Exception', detail: 'class System.Exception', documentation: 'Represents errors that occur during application execution.' },
  { name: 'ArgumentException', detail: 'class System.ArgumentException', documentation: 'The exception that is thrown when an argument is invalid.' },
  { name: 'Int32', detail: 'struct System.Int32', documentation: 'Represents a 32-bit signed integer.' },
  { name: 'Double', detail: 'struct System.Double', documentation: 'Represents a double-precision floating-point number.' },
  { name: 'Boolean', detail: 'struct System.Boolean', documentation: 'Represents a Boolean (true or false) value.' },
];

// System.Collections.Generic classes
const COLLECTIONS_CLASSES = [
  { name: 'List', detail: 'class List<T>', documentation: 'Represents a strongly typed list of objects that can be accessed by index.' },
  { name: 'Dictionary', detail: 'class Dictionary<TKey, TValue>', documentation: 'Represents a collection of keys and values.' },
  { name: 'HashSet', detail: 'class HashSet<T>', documentation: 'Represents a set of values with no duplicate elements.' },
  { name: 'Queue', detail: 'class Queue<T>', documentation: 'Represents a first-in, first-out collection of objects.' },
  { name: 'Stack', detail: 'class Stack<T>', documentation: 'Represents a variable size last-in-first-out (LIFO) collection.' },
  { name: 'LinkedList', detail: 'class LinkedList<T>', documentation: 'Represents a doubly linked list.' },
];

// Common namespaces for using directive
const COMMON_NAMESPACES = [
  { name: 'System', documentation: 'Contains fundamental classes and base classes that define commonly-used value and reference data types.' },
  { name: 'System.Collections.Generic', documentation: 'Contains interfaces and classes that define generic collections.' },
  { name: 'System.Linq', documentation: 'Provides classes and interfaces that support LINQ queries.' },
  { name: 'System.Text', documentation: 'Contains classes that represent ASCII and Unicode character encodings.' },
  { name: 'System.IO', documentation: 'Contains types that allow reading and writing to files and data streams.' },
  { name: 'System.Threading', documentation: 'Provides classes and interfaces that enable multithreaded programming.' },
  { name: 'System.Threading.Tasks', documentation: 'Provides types that simplify the work of writing concurrent and asynchronous code.' },
];

// Console methods
const CONSOLE_COMPLETIONS = [
  { label: 'Console.WriteLine', kind: 1, insertText: 'Console.WriteLine($0);', insertTextRules: 4, detail: 'void Console.WriteLine(string? value)', documentation: 'Writes the specified string value, followed by the current line terminator, to the standard output stream.' },
  { label: 'Console.Write', kind: 1, insertText: 'Console.Write($0);', insertTextRules: 4, detail: 'void Console.Write(string? value)', documentation: 'Writes the specified string value to the standard output stream.' },
  { label: 'Console.ReadLine', kind: 1, insertText: 'Console.ReadLine()', detail: 'string? Console.ReadLine()', documentation: 'Reads the next line of characters from the standard input stream.' },
  { label: 'Console.ReadKey', kind: 1, insertText: 'Console.ReadKey()', detail: 'ConsoleKeyInfo Console.ReadKey()', documentation: 'Obtains the next character or function key pressed by the user.' },
  { label: 'Console.Clear', kind: 1, insertText: 'Console.Clear()', detail: 'void Console.Clear()', documentation: 'Clears the console buffer and corresponding console window.' },
  { label: 'Console.ForegroundColor', kind: 4, insertText: 'Console.ForegroundColor = ConsoleColor.$0;', insertTextRules: 4, detail: 'ConsoleColor Console.ForegroundColor', documentation: 'Gets or sets the foreground color of the console.' },
  { label: 'Console.BackgroundColor', kind: 4, insertText: 'Console.BackgroundColor = ConsoleColor.$0;', insertTextRules: 4, detail: 'ConsoleColor Console.BackgroundColor', documentation: 'Gets or sets the background color of the console.' },
  { label: 'Console.ResetColor', kind: 1, insertText: 'Console.ResetColor()', detail: 'void Console.ResetColor()', documentation: 'Sets the foreground and background console colors to their defaults.' },
];

// Console member methods (after Console.)
const CONSOLE_MEMBERS = [
  { label: 'WriteLine', kind: 1, insertText: 'WriteLine($0);', insertTextRules: 4, detail: 'void WriteLine(string? value)', documentation: 'Writes the specified value followed by a line terminator.' },
  { label: 'Write', kind: 1, insertText: 'Write($0);', insertTextRules: 4, detail: 'void Write(string? value)', documentation: 'Writes the specified value to the output stream.' },
  { label: 'ReadLine', kind: 1, insertText: 'ReadLine()', detail: 'string? ReadLine()', documentation: 'Reads the next line of characters from input.' },
  { label: 'ReadKey', kind: 1, insertText: 'ReadKey()', detail: 'ConsoleKeyInfo ReadKey()', documentation: 'Reads the next key press.' },
  { label: 'Clear', kind: 1, insertText: 'Clear()', detail: 'void Clear()', documentation: 'Clears the console.' },
  { label: 'ForegroundColor', kind: 4, insertText: 'ForegroundColor = ConsoleColor.$0', insertTextRules: 4, detail: 'ConsoleColor ForegroundColor', documentation: 'Gets or sets the foreground color.' },
  { label: 'BackgroundColor', kind: 4, insertText: 'BackgroundColor = ConsoleColor.$0', insertTextRules: 4, detail: 'ConsoleColor BackgroundColor', documentation: 'Gets or sets the background color.' },
  { label: 'ResetColor', kind: 1, insertText: 'ResetColor()', detail: 'void ResetColor()', documentation: 'Resets colors to defaults.' },
  { label: 'Beep', kind: 1, insertText: 'Beep()', detail: 'void Beep()', documentation: 'Plays the sound of a beep.' },
  { label: 'Title', kind: 4, insertText: 'Title = "$0"', insertTextRules: 4, detail: 'string Title', documentation: 'Gets or sets the title of the console window.' },
];

// Math class methods
const MATH_MEMBERS = [
  { label: 'Abs', kind: 1, insertText: 'Abs($0)', insertTextRules: 4, detail: 'int/double Math.Abs(value)', documentation: 'Returns the absolute value of a number.' },
  { label: 'Max', kind: 1, insertText: 'Max($1, $2)', insertTextRules: 4, detail: 'T Math.Max(T val1, T val2)', documentation: 'Returns the larger of two numbers.' },
  { label: 'Min', kind: 1, insertText: 'Min($1, $2)', insertTextRules: 4, detail: 'T Math.Min(T val1, T val2)', documentation: 'Returns the smaller of two numbers.' },
  { label: 'Pow', kind: 1, insertText: 'Pow($1, $2)', insertTextRules: 4, detail: 'double Math.Pow(double x, double y)', documentation: 'Returns a specified number raised to the specified power.' },
  { label: 'Sqrt', kind: 1, insertText: 'Sqrt($0)', insertTextRules: 4, detail: 'double Math.Sqrt(double d)', documentation: 'Returns the square root of a specified number.' },
  { label: 'Round', kind: 1, insertText: 'Round($0)', insertTextRules: 4, detail: 'double Math.Round(double value)', documentation: 'Rounds a value to the nearest integer.' },
  { label: 'Floor', kind: 1, insertText: 'Floor($0)', insertTextRules: 4, detail: 'double Math.Floor(double d)', documentation: 'Returns the largest integer less than or equal to the number.' },
  { label: 'Ceiling', kind: 1, insertText: 'Ceiling($0)', insertTextRules: 4, detail: 'double Math.Ceiling(double a)', documentation: 'Returns the smallest integer greater than or equal to the number.' },
  { label: 'PI', kind: 5, insertText: 'PI', detail: 'const double Math.PI = 3.14159...', documentation: 'Represents the ratio of the circumference of a circle to its diameter.' },
  { label: 'E', kind: 5, insertText: 'E', detail: 'const double Math.E = 2.71828...', documentation: 'Represents the natural logarithmic base.' },
  { label: 'Sin', kind: 1, insertText: 'Sin($0)', insertTextRules: 4, detail: 'double Math.Sin(double a)', documentation: 'Returns the sine of the specified angle.' },
  { label: 'Cos', kind: 1, insertText: 'Cos($0)', insertTextRules: 4, detail: 'double Math.Cos(double d)', documentation: 'Returns the cosine of the specified angle.' },
  { label: 'Tan', kind: 1, insertText: 'Tan($0)', insertTextRules: 4, detail: 'double Math.Tan(double a)', documentation: 'Returns the tangent of the specified angle.' },
];

// Convert class methods
const CONVERT_MEMBERS = [
  { label: 'ToInt32', kind: 1, insertText: 'ToInt32($0)', insertTextRules: 4, detail: 'int Convert.ToInt32(object? value)', documentation: 'Converts the value to a 32-bit signed integer.' },
  { label: 'ToDouble', kind: 1, insertText: 'ToDouble($0)', insertTextRules: 4, detail: 'double Convert.ToDouble(object? value)', documentation: 'Converts the value to a double-precision floating-point number.' },
  { label: 'ToString', kind: 1, insertText: 'ToString($0)', insertTextRules: 4, detail: 'string Convert.ToString(object? value)', documentation: 'Converts the value to its string representation.' },
  { label: 'ToBoolean', kind: 1, insertText: 'ToBoolean($0)', insertTextRules: 4, detail: 'bool Convert.ToBoolean(object? value)', documentation: 'Converts the value to a Boolean value.' },
  { label: 'ToChar', kind: 1, insertText: 'ToChar($0)', insertTextRules: 4, detail: 'char Convert.ToChar(object? value)', documentation: 'Converts the value to a Unicode character.' },
  { label: 'ToByte', kind: 1, insertText: 'ToByte($0)', insertTextRules: 4, detail: 'byte Convert.ToByte(object? value)', documentation: 'Converts the value to an 8-bit unsigned integer.' },
];

// Random class methods
const RANDOM_MEMBERS = [
  { label: 'Next', kind: 1, insertText: 'Next($0)', insertTextRules: 4, detail: 'int Random.Next(int maxValue)', documentation: 'Returns a non-negative random integer less than the specified maximum.' },
  { label: 'NextDouble', kind: 1, insertText: 'NextDouble()', detail: 'double Random.NextDouble()', documentation: 'Returns a random floating-point number between 0.0 and 1.0.' },
  { label: 'NextBytes', kind: 1, insertText: 'NextBytes($0)', insertTextRules: 4, detail: 'void Random.NextBytes(byte[] buffer)', documentation: 'Fills the elements of a specified array with random numbers.' },
];

// DateTime members
const DATETIME_MEMBERS = [
  { label: 'Now', kind: 4, insertText: 'Now', detail: 'DateTime DateTime.Now', documentation: 'Gets a DateTime object that is set to the current date and time.' },
  { label: 'Today', kind: 4, insertText: 'Today', detail: 'DateTime DateTime.Today', documentation: 'Gets the current date.' },
  { label: 'Year', kind: 4, insertText: 'Year', detail: 'int Year', documentation: 'Gets the year component of the date.' },
  { label: 'Month', kind: 4, insertText: 'Month', detail: 'int Month', documentation: 'Gets the month component of the date.' },
  { label: 'Day', kind: 4, insertText: 'Day', detail: 'int Day', documentation: 'Gets the day of the month.' },
  { label: 'Hour', kind: 4, insertText: 'Hour', detail: 'int Hour', documentation: 'Gets the hour component of the date.' },
  { label: 'Minute', kind: 4, insertText: 'Minute', detail: 'int Minute', documentation: 'Gets the minute component of the date.' },
  { label: 'Second', kind: 4, insertText: 'Second', detail: 'int Second', documentation: 'Gets the seconds component of the date.' },
  { label: 'AddDays', kind: 1, insertText: 'AddDays($0)', insertTextRules: 4, detail: 'DateTime AddDays(double value)', documentation: 'Returns a new DateTime that adds the specified number of days.' },
  { label: 'AddMonths', kind: 1, insertText: 'AddMonths($0)', insertTextRules: 4, detail: 'DateTime AddMonths(int months)', documentation: 'Returns a new DateTime that adds the specified number of months.' },
  { label: 'AddYears', kind: 1, insertText: 'AddYears($0)', insertTextRules: 4, detail: 'DateTime AddYears(int years)', documentation: 'Returns a new DateTime that adds the specified number of years.' },
  { label: 'ToString', kind: 1, insertText: 'ToString($0)', insertTextRules: 4, detail: 'string ToString(string format)', documentation: 'Converts the value of the current DateTime to its string representation.' },
  { label: 'Parse', kind: 1, insertText: 'Parse($0)', insertTextRules: 4, detail: 'DateTime DateTime.Parse(string s)', documentation: 'Converts a string representation to its DateTime equivalent.' },
];

// String methods
const STRING_METHODS = [
  { label: 'Length', kind: 4, insertText: 'Length', detail: 'int Length', documentation: 'Gets the number of characters in the current String object.' },
  { label: 'ToUpper', kind: 1, insertText: 'ToUpper()', detail: 'string ToUpper()', documentation: 'Returns a copy of this string converted to uppercase.' },
  { label: 'ToLower', kind: 1, insertText: 'ToLower()', detail: 'string ToLower()', documentation: 'Returns a copy of this string converted to lowercase.' },
  { label: 'Trim', kind: 1, insertText: 'Trim()', detail: 'string Trim()', documentation: 'Removes all leading and trailing white-space characters.' },
  { label: 'TrimStart', kind: 1, insertText: 'TrimStart()', detail: 'string TrimStart()', documentation: 'Removes all leading white-space characters.' },
  { label: 'TrimEnd', kind: 1, insertText: 'TrimEnd()', detail: 'string TrimEnd()', documentation: 'Removes all trailing white-space characters.' },
  { label: 'Split', kind: 1, insertText: 'Split($0)', insertTextRules: 4, detail: 'string[] Split(char separator)', documentation: 'Splits a string into substrings based on specified delimiting characters.' },
  { label: 'Contains', kind: 1, insertText: 'Contains($0)', insertTextRules: 4, detail: 'bool Contains(string value)', documentation: 'Returns a value indicating whether a specified substring occurs within this string.' },
  { label: 'Replace', kind: 1, insertText: 'Replace($1, $2)', insertTextRules: 4, detail: 'string Replace(string oldValue, string newValue)', documentation: 'Returns a new string in which all occurrences of a specified string are replaced.' },
  { label: 'Substring', kind: 1, insertText: 'Substring($0)', insertTextRules: 4, detail: 'string Substring(int startIndex)', documentation: 'Retrieves a substring from this instance.' },
  { label: 'IndexOf', kind: 1, insertText: 'IndexOf($0)', insertTextRules: 4, detail: 'int IndexOf(string value)', documentation: 'Reports the zero-based index of the first occurrence of the specified string.' },
  { label: 'LastIndexOf', kind: 1, insertText: 'LastIndexOf($0)', insertTextRules: 4, detail: 'int LastIndexOf(string value)', documentation: 'Reports the zero-based index of the last occurrence of the specified string.' },
  { label: 'StartsWith', kind: 1, insertText: 'StartsWith($0)', insertTextRules: 4, detail: 'bool StartsWith(string value)', documentation: 'Determines whether the beginning of this string matches the specified string.' },
  { label: 'EndsWith', kind: 1, insertText: 'EndsWith($0)', insertTextRules: 4, detail: 'bool EndsWith(string value)', documentation: 'Determines whether the end of this string matches the specified string.' },
  { label: 'Equals', kind: 1, insertText: 'Equals($0)', insertTextRules: 4, detail: 'bool Equals(string value)', documentation: 'Determines whether this instance and another specified String have the same value.' },
  { label: 'CompareTo', kind: 1, insertText: 'CompareTo($0)', insertTextRules: 4, detail: 'int CompareTo(string value)', documentation: 'Compares this instance with a specified String object.' },
  { label: 'ToCharArray', kind: 1, insertText: 'ToCharArray()', detail: 'char[] ToCharArray()', documentation: 'Copies the characters in this instance to a Unicode character array.' },
  { label: 'PadLeft', kind: 1, insertText: 'PadLeft($0)', insertTextRules: 4, detail: 'string PadLeft(int totalWidth)', documentation: 'Returns a new string that right-aligns the characters by padding on the left.' },
  { label: 'PadRight', kind: 1, insertText: 'PadRight($0)', insertTextRules: 4, detail: 'string PadRight(int totalWidth)', documentation: 'Returns a new string that left-aligns the characters by padding on the right.' },
  { label: 'Insert', kind: 1, insertText: 'Insert($1, $2)', insertTextRules: 4, detail: 'string Insert(int startIndex, string value)', documentation: 'Returns a new string in which a specified string is inserted at a specified index.' },
  { label: 'Remove', kind: 1, insertText: 'Remove($0)', insertTextRules: 4, detail: 'string Remove(int startIndex)', documentation: 'Returns a new string in which a specified number of characters have been deleted.' },
];

// Static String methods
const STRING_STATIC_METHODS = [
  { label: 'IsNullOrEmpty', kind: 1, insertText: 'IsNullOrEmpty($0)', insertTextRules: 4, detail: 'bool String.IsNullOrEmpty(string? value)', documentation: 'Indicates whether the specified string is null or empty.' },
  { label: 'IsNullOrWhiteSpace', kind: 1, insertText: 'IsNullOrWhiteSpace($0)', insertTextRules: 4, detail: 'bool String.IsNullOrWhiteSpace(string? value)', documentation: 'Indicates whether the specified string is null, empty, or consists only of white-space.' },
  { label: 'Join', kind: 1, insertText: 'Join($1, $2)', insertTextRules: 4, detail: 'string String.Join(string separator, params string[] values)', documentation: 'Concatenates the elements of a specified array, using the specified separator.' },
  { label: 'Format', kind: 1, insertText: 'Format($0)', insertTextRules: 4, detail: 'string String.Format(string format, params object?[] args)', documentation: 'Replaces format items in a string with the string representation of specified objects.' },
  { label: 'Concat', kind: 1, insertText: 'Concat($0)', insertTextRules: 4, detail: 'string String.Concat(params string?[] values)', documentation: 'Concatenates one or more strings.' },
  { label: 'Compare', kind: 1, insertText: 'Compare($1, $2)', insertTextRules: 4, detail: 'int String.Compare(string? strA, string? strB)', documentation: 'Compares two specified String objects.' },
];

// List<T> methods
const LIST_METHODS = [
  { label: 'Add', kind: 1, insertText: 'Add($0)', insertTextRules: 4, detail: 'void Add(T item)', documentation: 'Adds an object to the end of the List<T>.' },
  { label: 'AddRange', kind: 1, insertText: 'AddRange($0)', insertTextRules: 4, detail: 'void AddRange(IEnumerable<T> collection)', documentation: 'Adds the elements of the specified collection to the end of the List<T>.' },
  { label: 'Remove', kind: 1, insertText: 'Remove($0)', insertTextRules: 4, detail: 'bool Remove(T item)', documentation: 'Removes the first occurrence of a specific object from the List<T>.' },
  { label: 'RemoveAt', kind: 1, insertText: 'RemoveAt($0)', insertTextRules: 4, detail: 'void RemoveAt(int index)', documentation: 'Removes the element at the specified index of the List<T>.' },
  { label: 'Clear', kind: 1, insertText: 'Clear()', detail: 'void Clear()', documentation: 'Removes all elements from the List<T>.' },
  { label: 'Contains', kind: 1, insertText: 'Contains($0)', insertTextRules: 4, detail: 'bool Contains(T item)', documentation: 'Determines whether an element is in the List<T>.' },
  { label: 'IndexOf', kind: 1, insertText: 'IndexOf($0)', insertTextRules: 4, detail: 'int IndexOf(T item)', documentation: 'Searches for the specified object and returns the zero-based index.' },
  { label: 'Insert', kind: 1, insertText: 'Insert($1, $2)', insertTextRules: 4, detail: 'void Insert(int index, T item)', documentation: 'Inserts an element into the List<T> at the specified index.' },
  { label: 'Sort', kind: 1, insertText: 'Sort()', detail: 'void Sort()', documentation: 'Sorts the elements in the entire List<T>.' },
  { label: 'Reverse', kind: 1, insertText: 'Reverse()', detail: 'void Reverse()', documentation: 'Reverses the order of the elements in the entire List<T>.' },
  { label: 'ToArray', kind: 1, insertText: 'ToArray()', detail: 'T[] ToArray()', documentation: 'Copies the elements of the List<T> to a new array.' },
  { label: 'Count', kind: 4, insertText: 'Count', detail: 'int Count', documentation: 'Gets the number of elements contained in the List<T>.' },
  { label: 'Find', kind: 1, insertText: 'Find($0)', insertTextRules: 4, detail: 'T? Find(Predicate<T> match)', documentation: 'Searches for an element that matches the conditions.' },
  { label: 'FindAll', kind: 1, insertText: 'FindAll($0)', insertTextRules: 4, detail: 'List<T> FindAll(Predicate<T> match)', documentation: 'Retrieves all the elements that match the conditions.' },
  { label: 'Exists', kind: 1, insertText: 'Exists($0)', insertTextRules: 4, detail: 'bool Exists(Predicate<T> match)', documentation: 'Determines whether the List<T> contains elements that match the conditions.' },
  { label: 'ForEach', kind: 1, insertText: 'ForEach($0)', insertTextRules: 4, detail: 'void ForEach(Action<T> action)', documentation: 'Performs the specified action on each element of the List<T>.' },
];

// Array methods
const ARRAY_METHODS = [
  { label: 'Length', kind: 4, insertText: 'Length', detail: 'int Length', documentation: 'Gets the total number of elements in all dimensions of the Array.' },
  { label: 'Sort', kind: 1, insertText: 'Sort($0)', insertTextRules: 4, detail: 'void Array.Sort(Array array)', documentation: 'Sorts the elements in a one-dimensional Array.' },
  { label: 'Reverse', kind: 1, insertText: 'Reverse($0)', insertTextRules: 4, detail: 'void Array.Reverse(Array array)', documentation: 'Reverses the order of the elements in a one-dimensional Array.' },
  { label: 'IndexOf', kind: 1, insertText: 'IndexOf($1, $2)', insertTextRules: 4, detail: 'int Array.IndexOf(Array array, object? value)', documentation: 'Searches for the specified object and returns the index.' },
  { label: 'Copy', kind: 1, insertText: 'Copy($1, $2, $3)', insertTextRules: 4, detail: 'void Array.Copy(Array source, Array dest, int length)', documentation: 'Copies a range of elements from an Array to another Array.' },
  { label: 'Clear', kind: 1, insertText: 'Clear($1, $2, $3)', insertTextRules: 4, detail: 'void Array.Clear(Array array, int index, int length)', documentation: 'Sets a range of elements in an array to the default value.' },
  { label: 'Resize', kind: 1, insertText: 'Resize(ref $1, $2)', insertTextRules: 4, detail: 'void Array.Resize<T>(ref T[]? array, int newSize)', documentation: 'Changes the number of elements of a one-dimensional array.' },
];

// Code snippets for classes and namespaces
const CODE_SNIPPETS = [
  { label: 'namespace', kind: 14, insertText: 'namespace ${1:MyNamespace}\n{\n\t$0\n}', insertTextRules: 4, detail: 'namespace declaration', documentation: 'Declares a namespace to organize code.' },
  { label: 'class', kind: 14, insertText: 'class ${1:MyClass}\n{\n\t$0\n}', insertTextRules: 4, detail: 'class declaration', documentation: 'Declares a new class.' },
  { label: 'public class', kind: 14, insertText: 'public class ${1:MyClass}\n{\n\t$0\n}', insertTextRules: 4, detail: 'public class declaration', documentation: 'Declares a new public class.' },
  { label: 'static class', kind: 14, insertText: 'static class ${1:MyClass}\n{\n\t$0\n}', insertTextRules: 4, detail: 'static class declaration', documentation: 'Declares a new static class.' },
  { label: 'interface', kind: 14, insertText: 'interface ${1:IMyInterface}\n{\n\t$0\n}', insertTextRules: 4, detail: 'interface declaration', documentation: 'Declares a new interface.' },
  { label: 'struct', kind: 14, insertText: 'struct ${1:MyStruct}\n{\n\t$0\n}', insertTextRules: 4, detail: 'struct declaration', documentation: 'Declares a new value type struct.' },
  { label: 'enum', kind: 14, insertText: 'enum ${1:MyEnum}\n{\n\t${2:Value1},\n\t${3:Value2}\n}', insertTextRules: 4, detail: 'enum declaration', documentation: 'Declares an enumeration type.' },
  { label: 'Main', kind: 14, insertText: 'static void Main(string[] args)\n{\n\t$0\n}', insertTextRules: 4, detail: 'Main method', documentation: 'Entry point for the application.' },
  { label: 'method', kind: 14, insertText: '${1:void} ${2:MyMethod}(${3})\n{\n\t$0\n}', insertTextRules: 4, detail: 'method declaration', documentation: 'Declares a new method.' },
  { label: 'public method', kind: 14, insertText: 'public ${1:void} ${2:MyMethod}(${3})\n{\n\t$0\n}', insertTextRules: 4, detail: 'public method declaration', documentation: 'Declares a new public method.' },
  { label: 'static method', kind: 14, insertText: 'public static ${1:void} ${2:MyMethod}(${3})\n{\n\t$0\n}', insertTextRules: 4, detail: 'static method declaration', documentation: 'Declares a new static method.' },
  { label: 'property', kind: 14, insertText: 'public ${1:string} ${2:MyProperty} { get; set; }', insertTextRules: 4, detail: 'auto property', documentation: 'Declares an auto-implemented property.' },
  { label: 'propfull', kind: 14, insertText: 'private ${1:string} _${2:myField};\npublic ${1:string} ${3:MyProperty}\n{\n\tget { return _${2:myField}; }\n\tset { _${2:myField} = value; }\n}', insertTextRules: 4, detail: 'property with backing field', documentation: 'Declares a property with a backing field.' },
  { label: 'ctor', kind: 14, insertText: 'public ${1:ClassName}(${2})\n{\n\t$0\n}', insertTextRules: 4, detail: 'constructor', documentation: 'Declares a constructor.' },
  { label: 'if', kind: 14, insertText: 'if (${1:condition})\n{\n\t$0\n}', insertTextRules: 4, detail: 'if statement', documentation: 'If conditional statement.' },
  { label: 'ifelse', kind: 14, insertText: 'if (${1:condition})\n{\n\t$2\n}\nelse\n{\n\t$0\n}', insertTextRules: 4, detail: 'if-else statement', documentation: 'If-else conditional statement.' },
  { label: 'for', kind: 14, insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++)\n{\n\t$0\n}', insertTextRules: 4, detail: 'for loop', documentation: 'For loop iteration.' },
  { label: 'foreach', kind: 14, insertText: 'foreach (var ${1:item} in ${2:collection})\n{\n\t$0\n}', insertTextRules: 4, detail: 'foreach loop', documentation: 'Foreach loop over a collection.' },
  { label: 'while', kind: 14, insertText: 'while (${1:condition})\n{\n\t$0\n}', insertTextRules: 4, detail: 'while loop', documentation: 'While loop.' },
  { label: 'do', kind: 14, insertText: 'do\n{\n\t$0\n} while (${1:condition});', insertTextRules: 4, detail: 'do-while loop', documentation: 'Do-while loop.' },
  { label: 'switch', kind: 14, insertText: 'switch (${1:variable})\n{\n\tcase ${2:value}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', insertTextRules: 4, detail: 'switch statement', documentation: 'Switch statement.' },
  { label: 'try', kind: 14, insertText: 'try\n{\n\t$0\n}\ncatch (Exception ex)\n{\n\t\n}', insertTextRules: 4, detail: 'try-catch block', documentation: 'Try-catch exception handling.' },
  { label: 'trycf', kind: 14, insertText: 'try\n{\n\t$0\n}\ncatch (Exception ex)\n{\n\t\n}\nfinally\n{\n\t\n}', insertTextRules: 4, detail: 'try-catch-finally', documentation: 'Try-catch-finally exception handling.' },
  { label: 'using statement', kind: 14, insertText: 'using (${1:var resource = new Resource()})\n{\n\t$0\n}', insertTextRules: 4, detail: 'using statement', documentation: 'Using statement for IDisposable resources.' },
  { label: 'cw', kind: 14, insertText: 'Console.WriteLine($0);', insertTextRules: 4, detail: 'Console.WriteLine', documentation: 'Shortcut for Console.WriteLine.' },
  { label: 'cr', kind: 14, insertText: 'Console.ReadLine()', detail: 'Console.ReadLine', documentation: 'Shortcut for Console.ReadLine.' },
];

// Initialize C# IntelliSense Engine
const initializeCSharpIntelliSense = (monaco: Monaco) => {
  // Define a custom dark theme with proper suggest widget colors
  monaco.editor.defineTheme('cis118m-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569cd6' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'comment', foreground: '6a9955' },
      { token: 'type', foreground: '4ec9b0' },
    ],
    colors: {
      // Editor colors
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      // Suggest widget (IntelliSense dropdown) - CRITICAL FIX
      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.border': '#454545',
      'editorSuggestWidget.foreground': '#d4d4d4',
      'editorSuggestWidget.selectedForeground': '#ffffff',
      'editorSuggestWidget.selectedBackground': '#062f4a',
      'editorSuggestWidget.highlightForeground': '#18a3ff',
      'editorSuggestWidget.focusHighlightForeground': '#18a3ff',
      // Widget (hover, details panel)
      'editorWidget.background': '#252526',
      'editorWidget.foreground': '#d4d4d4',
      'editorWidget.border': '#454545',
      // Hover widget
      'editorHoverWidget.background': '#252526',
      'editorHoverWidget.foreground': '#d4d4d4',
      'editorHoverWidget.border': '#454545',
      // List (dropdown items)
      'list.hoverBackground': '#2a2d2e',
      'list.hoverForeground': '#d4d4d4',
      'list.focusBackground': '#062f4a',
      'list.focusForeground': '#ffffff',
      'list.activeSelectionBackground': '#062f4a',
      'list.activeSelectionForeground': '#ffffff',
      'list.inactiveSelectionBackground': '#37373d',
      'list.inactiveSelectionForeground': '#d4d4d4',
      'list.highlightForeground': '#18a3ff',
    },
  });

  // Define a custom light theme
  monaco.editor.defineTheme('cis118m-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000ff' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'comment', foreground: '008000' },
      { token: 'type', foreground: '267f99' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      // Suggest widget for light mode
      'editorSuggestWidget.background': '#f3f3f3',
      'editorSuggestWidget.border': '#c8c8c8',
      'editorSuggestWidget.foreground': '#000000',
      'editorSuggestWidget.selectedForeground': '#000000',
      'editorSuggestWidget.selectedBackground': '#0060c0',
      'editorSuggestWidget.highlightForeground': '#0066bf',
      'editorSuggestWidget.focusHighlightForeground': '#0066bf',
      'editorWidget.background': '#f3f3f3',
      'editorWidget.foreground': '#000000',
      'editorWidget.border': '#c8c8c8',
      'editorHoverWidget.background': '#f3f3f3',
      'editorHoverWidget.foreground': '#000000',
      'editorHoverWidget.border': '#c8c8c8',
      'list.hoverBackground': '#e8e8e8',
      'list.hoverForeground': '#000000',
      'list.focusBackground': '#0060c0',
      'list.focusForeground': '#ffffff',
      'list.activeSelectionBackground': '#0060c0',
      'list.activeSelectionForeground': '#ffffff',
      'list.inactiveSelectionBackground': '#e4e6f1',
      'list.inactiveSelectionForeground': '#000000',
      'list.highlightForeground': '#0066bf',
    },
  });

  // Register completion provider for C#
  monaco.languages.registerCompletionItemProvider('csharp', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Get the line text before cursor to determine context
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);
      const fullText = model.getValue();

      const suggestions: any[] = [];

      // Helper function to add suggestions from an array
      const addSuggestions = (items: any[], kindOverride?: any) => {
        items.forEach(item => {
          const kind = kindOverride || (
            item.kind === 1 ? monaco.languages.CompletionItemKind.Method :
            item.kind === 4 ? monaco.languages.CompletionItemKind.Property :
            item.kind === 5 ? monaco.languages.CompletionItemKind.Constant :
            item.kind === 14 ? monaco.languages.CompletionItemKind.Snippet :
            monaco.languages.CompletionItemKind.Field
          );
          suggestions.push({
            label: item.label || item.name,
            kind,
            insertText: item.insertText || item.name,
            insertTextRules: item.insertTextRules ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            detail: item.detail,
            documentation: item.documentation ? { value: item.documentation } : undefined,
            range,
            sortText: item.sortText || item.label || item.name,
          });
        });
      };

      // ========== CONTEXT: After "using " ==========
      if (textBeforeCursor.match(/using\s+$/)) {
        COMMON_NAMESPACES.forEach(ns => {
          suggestions.push({
            label: ns.name,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: ns.name + ';',
            detail: 'namespace',
            documentation: { value: ns.documentation },
            range,
          });
        });
        return { suggestions };
      }

      // ========== CONTEXT: After "Console." ==========
      if (textBeforeCursor.match(/Console\.$/)) {
        addSuggestions(CONSOLE_MEMBERS);
        return { suggestions };
      }

      // ========== CONTEXT: After "Math." ==========
      if (textBeforeCursor.match(/Math\.$/)) {
        addSuggestions(MATH_MEMBERS);
        return { suggestions };
      }

      // ========== CONTEXT: After "Convert." ==========
      if (textBeforeCursor.match(/Convert\.$/)) {
        addSuggestions(CONVERT_MEMBERS);
        return { suggestions };
      }

      // ========== CONTEXT: After "DateTime." ==========
      if (textBeforeCursor.match(/DateTime\.$/)) {
        addSuggestions(DATETIME_MEMBERS);
        return { suggestions };
      }

      // ========== CONTEXT: After "String." (static methods) ==========
      if (textBeforeCursor.match(/String\.$/)) {
        addSuggestions(STRING_STATIC_METHODS);
        return { suggestions };
      }

      // ========== CONTEXT: After "Array." (static methods) ==========
      if (textBeforeCursor.match(/Array\.$/)) {
        addSuggestions(ARRAY_METHODS);
        return { suggestions };
      }

      // ========== CONTEXT: After a Random instance "rand." or "random." ==========
      if (textBeforeCursor.match(/\b(rand|random|rng|r)\.\s*$/i)) {
        addSuggestions(RANDOM_MEMBERS);
        return { suggestions };
      }

      // ========== CONTEXT: After a List instance ".Add", ".Remove", etc ==========
      if (textBeforeCursor.match(/\b(list|items|collection|arr|numbers|names|words|students|data)\.\s*$/i)) {
        addSuggestions(LIST_METHODS);
        return { suggestions };
      }

      // ========== CONTEXT: After a string literal or string variable ==========
      if (textBeforeCursor.match(/\"\s*\.\s*$/) || textBeforeCursor.match(/\b(str|name|text|input|line|word|s|message|result)\.\s*$/i)) {
        addSuggestions(STRING_METHODS);
        return { suggestions };
      }

      // ========== CONTEXT: After any identifier followed by dot (generic member access) ==========
      if (textBeforeCursor.match(/\w+\.\s*$/)) {
        // Add common methods that exist on most objects
        addSuggestions(STRING_METHODS);
        addSuggestions(LIST_METHODS);
        suggestions.push({
          label: 'ToString',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'ToString()',
          detail: 'string ToString()',
          documentation: { value: 'Returns a string that represents the current object.' },
          range,
        });
        suggestions.push({
          label: 'GetType',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'GetType()',
          detail: 'Type GetType()',
          documentation: { value: 'Gets the Type of the current instance.' },
          range,
        });
        suggestions.push({
          label: 'Equals',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'Equals($0)',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'bool Equals(object? obj)',
          documentation: { value: 'Determines whether the specified object is equal to the current object.' },
          range,
        });
        return { suggestions };
      }

      // ========== GENERAL CONTEXT: No dot, provide all options ==========
      const currentWord = word.word.toLowerCase();
      
      // Code snippets (highest priority for structure)
      CODE_SNIPPETS.forEach(snippet => {
        if (currentWord === '' || snippet.label.toLowerCase().startsWith(currentWord)) {
          suggestions.push({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snippet.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: snippet.detail,
            documentation: { value: snippet.documentation },
            range,
            sortText: '0' + snippet.label, // Prioritize snippets
          });
        }
      });

      // C# Keywords
      CSHARP_KEYWORDS.forEach(kw => {
        if (currentWord === '' || kw.toLowerCase().startsWith(currentWord)) {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            detail: 'keyword',
            range,
            sortText: '1' + kw,
          });
        }
      });

      // System namespace classes
      SYSTEM_NAMESPACE_CLASSES.forEach(cls => {
        if (currentWord === '' || cls.name.toLowerCase().startsWith(currentWord)) {
          suggestions.push({
            label: cls.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: cls.name,
            detail: cls.detail,
            documentation: { value: cls.documentation },
            range,
            sortText: '2' + cls.name,
          });
        }
      });

      // Collections classes
      COLLECTIONS_CLASSES.forEach(cls => {
        if (currentWord === '' || cls.name.toLowerCase().startsWith(currentWord)) {
          suggestions.push({
            label: cls.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: cls.name + '<$0>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: cls.detail,
            documentation: { value: cls.documentation },
            range,
            sortText: '2' + cls.name,
          });
        }
      });

      // Console methods (full qualified)
      if (currentWord === '' || 'console'.startsWith(currentWord)) {
        CONSOLE_COMPLETIONS.forEach(c => {
          suggestions.push({
            label: c.label,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: c.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: c.detail,
            documentation: { value: c.documentation },
            range,
            sortText: '3' + c.label,
          });
        });
      }

      return { suggestions };
    },
  });

  // Register hover provider for documentation
  monaco.languages.registerHoverProvider('csharp', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      
      const wordText = word.word;

      // Check all completion sources for hover info
      const allCompletions = [
        ...CONSOLE_COMPLETIONS,
        ...CONSOLE_MEMBERS,
        ...STRING_METHODS,
        ...STRING_STATIC_METHODS,
        ...MATH_MEMBERS,
        ...CONVERT_MEMBERS,
        ...DATETIME_MEMBERS,
        ...RANDOM_MEMBERS,
        ...LIST_METHODS,
        ...ARRAY_METHODS,
        ...CODE_SNIPPETS,
      ];

      const match = allCompletions.find(c => (c.label || c.name) === wordText);
      if (match) {
        return {
          contents: [
            { value: `**${match.detail}**` },
            { value: match.documentation },
          ],
        };
      }

      // Check System classes
      const classMatch = SYSTEM_NAMESPACE_CLASSES.find(c => c.name === wordText);
      if (classMatch) {
        return {
          contents: [
            { value: `**${classMatch.detail}**` },
            { value: classMatch.documentation },
          ],
        };
      }

      // Check Collections classes
      const collectionMatch = COLLECTIONS_CLASSES.find(c => c.name === wordText);
      if (collectionMatch) {
        return {
          contents: [
            { value: `**${collectionMatch.detail}**` },
            { value: collectionMatch.documentation },
          ],
        };
      }

      // Check keywords
      if (CSHARP_KEYWORDS.includes(wordText)) {
        return {
          contents: [
            { value: `**${wordText}**` },
            { value: `C# keyword` },
          ],
        };
      }

      return null;
    },
  });

  console.log('[IntelliSense] C# language provider initialized with enhanced completions');
};

const DEFAULT_WEEK = "01";
const RUN_MODE = (import.meta.env.PUBLIC_RUN_MODE || "stub").toLowerCase();
const weeks = Array.from(new Set(starters.map((s) => s.week)));

const pickInitialStarter = () => {
  const fallback = defaultStarterForWeek(DEFAULT_WEEK);
  if (typeof window === "undefined") {
    return fallback;
  }

  const params = new URLSearchParams(window.location.search);
  const weekParam = normalizeWeek(params.get("week") || fallback.week);
  const starterParam = params.get("starter") || "lesson-1";
  const fromUrl = findStarter(weekParam, starterParam);

  if (fromUrl) return fromUrl;
  const byWeek = defaultStarterForWeek(weekParam);
  return byWeek || fallback;
};

const starterLabel = (slug: string) => {
  if (slug === "lesson-1") return "Lesson 1 starter";
  if (slug === "lesson-2") return "Lesson 2 starter";
  if (slug === "extra-practice") return "Extra practice";
  return "Starter";
};

function formatTimestamp(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const EditorApp = () => {
  const initialStarter = pickInitialStarter();
  const [selectedWeek, setSelectedWeek] = useState(initialStarter.week);
  const [starterId, setStarterId] = useState(initialStarter.id);
  // Multi-file state
  const [files, setFiles] = useState<StarterFile[]>(initialStarter.files);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [output, setOutput] = useState("Output will appear here after Run.");
  const [stderr, setStderr] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editorTheme, setEditorTheme] = useState("cis118m-dark");
  const saveTimer = useRef<number | undefined>();
  const monacoRef = useRef<Monaco | null>(null);

  const startersForWeek = useMemo(() => startersByWeek(selectedWeek), [selectedWeek]);
  
  // Current active file content
  const activeFile = files[activeFileIndex] || files[0];

  // Sync editor theme with site data-theme attribute
  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.body.getAttribute('data-theme') !== 'light';
      setEditorTheme(isDark ? "cis118m-dark" : "cis118m-light");
    };
    
    syncTheme(); // Initial sync
    
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);

  // Load starter files when starter changes
  useEffect(() => {
    const starter = findStarterById(starterId) || defaultStarterForWeek(selectedWeek);
    const savedFiles = loadSavedFiles(starter.id);
    setSelectedWeek(starter.week);
    setFiles(savedFiles ?? starter.files);
    setActiveFileIndex(0);
    setOutput("Ready. Use Run or start typing.");
    setStderr("");
  }, [starterId, selectedWeek]);

  // Auto-save files
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!starterId || files.length === 0) return;

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveFiles(starterId, files);
      setLastSaved(new Date());
    }, 500);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [starterId, files]);

  // Update file content when editing
  const handleCodeChange = (newContent: string | undefined) => {
    if (newContent === undefined) return;
    setFiles(prevFiles => 
      prevFiles.map((f, i) => 
        i === activeFileIndex ? { ...f, content: newContent } : f
      )
    );
  };

  const handleWeekChange = (week: string) => {
    const normalized = normalizeWeek(week);
    const starter = defaultStarterForWeek(normalized);
    setSelectedWeek(normalized);
    setStarterId(starter.id);
  };

  const handleStarterChange = (value: string) => {
    const starter = findStarterById(value);
    if (starter) {
      setStarterId(starter.id);
      setSelectedWeek(starter.week);
    }
  };

  const handleCopy = async () => {
    try {
      // Copy all files as combined content
      const allCode = files.map(f => `// === ${f.name} ===\n${f.content}`).join('\n\n');
      await navigator.clipboard.writeText(allCode);
      setOutput(`Copied ${files.length} file(s) to clipboard.`);
      setStderr("");
    } catch (err) {
      setStderr("Copy failed. Your browser may block clipboard access.");
    }
  };

  const handleDownload = () => {
    const week = normalizeWeek(selectedWeek);
    if (files.length === 1) {
      // Single file download
      const blob = new Blob([files[0].content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = files[0].name;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Multi-file: combine into single download
      const combined = files.map(f => `// === ${f.name} ===\n${f.content}`).join('\n\n');
      const blob = new Blob([combined], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Week${week}-all-files.cs`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    const starter = findStarterById(starterId);
    if (!starter) return;
    resetCode(starter.id);
    setFiles(starter.files);
    setActiveFileIndex(0);
    setOutput("Starter restored.");
    setStderr("");
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    setStderr("");
    // Send all files to the runner - primary file (Program.cs) first
    const source = files.map(f => f.content).join('\n\n');
    const result = await runCode({ starterId, source });
    setIsRunning(false);

    if (result.ok) {
      setOutput(result.stdout || "(no output)");
      setStderr(result.stderr || "");
    } else {
      setOutput("");
      setStderr(result.error);
    }
  };

  const currentStarter = findStarterById(starterId) || initialStarter;

  return (
    <div className="editor-shell">
      <div className="editor-card editor-header">
        <div className="editor-selects">
          <label>
            Week
            <select
              value={selectedWeek}
              onChange={(e) => handleWeekChange(e.target.value)}
              aria-label="Select week starter"
            >
              {weeks.map((week) => (
                <option key={week} value={week}>{`Week ${Number(week)}`}</option>
              ))}
            </select>
          </label>

          <label>
            Starter
            <select
              value={starterId}
              onChange={(e) => handleStarterChange(e.target.value)}
              aria-label="Select starter"
            >
              {startersForWeek.map((starter) => (
                <option key={starter.id} value={starter.id}>
                  {starterLabel(starter.slug)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="editor-actions">
          <button className="button-solid" onClick={handleRun} disabled={isRunning} aria-label="Run code">
            {isRunning ? "Running..." : "Run"}
          </button>
          <button className="button-ghost" onClick={handleReset} aria-label="Reset to starter">
            Reset to starter
          </button>
          <button className="button-ghost" onClick={handleCopy} aria-label="Copy code">
            Copy code
          </button>
          <button className="button-ghost" onClick={handleDownload} aria-label="Download code">
            Download .cs
          </button>
        </div>

        <div className="editor-meta">
          <span className="tag">Run mode: {RUN_MODE === "proxy" ? "Proxy" : "Stub"}</span>
          {lastSaved ? ` • Saved ${formatTimestamp(lastSaved)}` : " • Auto-saves locally per starter"}
        </div>
      </div>

      <div className="editor-grid">
        <div className="editor-card">
          <div className="editor-panel-title">
            <span>{currentStarter.title}</span>
            <small>{buildStarterId(currentStarter.week, currentStarter.slug)}</small>
          </div>
          
          {/* File Tabs */}
          {files.length > 1 && (
            <div className="file-tabs">
              {files.map((file, index) => (
                <button
                  key={file.name}
                  className={`file-tab ${index === activeFileIndex ? 'active' : ''}`}
                  onClick={() => setActiveFileIndex(index)}
                  title={file.name}
                >
                  <span className="file-icon">📄</span>
                  {file.name}
                </button>
              ))}
            </div>
          )}
          
          <Editor
            height={files.length > 1 ? "480px" : "520px"}
            language="csharp"
            theme={editorTheme}
            value={activeFile?.content ?? ""}
            onChange={handleCodeChange}
            onMount={(editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
              monacoRef.current = monaco;
              initializeCSharpIntelliSense(monaco);
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              parameterHints: { enabled: true },
              tabCompletion: "on",
              formatOnPaste: true,
              formatOnType: true,
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              autoIndent: "full",
              scrollBeyondLastLine: false,
              renderLineHighlight: "all",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              // IntelliSense display options
              suggest: {
                showIcons: true,
                showStatusBar: true,
                preview: true,
                showInlineDetails: true,
                showMethods: true,
                showFunctions: true,
                showVariables: true,
                showClasses: true,
                showKeywords: true,
                showSnippets: true,
                filterGraceful: true,
                localityBonus: true,
              },
              // Enable the details widget (documentation popup)
              "semanticHighlighting.enabled": true,
            }}
          />
        </div>

        <div className="editor-card">
          <div className="editor-panel-title">
            <span>Output</span>
            <small>{RUN_MODE === "stub" ? "Stub mode" : "Proxy mode"}</small>
          </div>
          <div className="output-box">
            {output}
            {stderr ? `\n\n${stderr}` : ""}
          </div>
          <div className="editor-status">
            {RUN_MODE === "stub"
              ? "Run is in stub mode for now. Copy or download your code to run it locally."
              : "Run sends your code to the sandbox runner via /api/run."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorApp;
