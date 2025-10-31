// Type definitions for any-shell-escape
// Project: https://github.com/boazy/any-shell-escape
// Definitions by: Augment Agent

declare module 'any-shell-escape' {
  /**
   * Escape and stringify an array of arguments or a single string to be executed on the shell.
   * Automatically detects the platform and uses appropriate escaping rules.
   *
   * @param stringOrArray - A string or array of strings to escape
   * @returns Escaped string suitable for shell execution
   */
  function anyShellEscape(stringOrArray: string | string[]): string;

  namespace anyShellEscape {
    /**
     * Escape arguments for echo messages.
     * On Windows, returns unescaped strings.
     * On Unix, uses the same escaping as the main function.
     *
     * @param stringOrArray - A string or array of strings to escape
     * @returns Escaped string suitable for echo messages
     */
    function msg(stringOrArray: string | string[]): string;
  }

  export = anyShellEscape;
}
