class Settings {
    get VERSION() {
        return `res ${this.resVersion} code ${this.codeVersion}`;
    }
    resVersion: string = "1.0.3";
    codeVersion: string = "1.0.5";
}

export const settings = new Settings();