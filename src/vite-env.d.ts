/// <reference types="vite/client" />

declare module 'poker-odds-calc' {
  export class TexasHoldem {
    addPlayer(cards: string[]): this;
    setBoard(cards: string[]): this;
    calculate(): {
      getPlayers(): Array<{
        getWinsPercentageString(): string;
        getTiesPercentageString(): string;
      }>;
    };
  }
}
