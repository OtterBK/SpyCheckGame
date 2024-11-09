// Card.ts
export interface Card {
    toString(): string;
}

export class Deck 
{
  private cards: Array<Card> = [];

  // 덱 위에 카드 추가 (push를 사용해 스택처럼 동작)
  addCard(card: Card): void 
  {
    this.cards.push(card); // 배열 맨 뒤에 추가 (덱의 위로 추가)
  }

  // 덱 아래에 카드 추가 (unshift를 사용해 배열의 맨 앞에 추가)
  addCardToBottom(card: Card): void 
  {
    this.cards.unshift(card); // 배열 맨 앞에 추가 (덱의 아래로 추가)
  }

  // 덱 위에 카드 뭉치 추가 (push로 여러 장 추가)
  addCards(cards: Array<Card>): void 
  {
    this.cards.push(...cards); // 배열 맨 뒤에 여러 장 추가
  }

  // 덱 아래에 카드 뭉치 추가 (unshift로 여러 장 추가)
  addCardsToBottom(cards: Array<Card>): void 
  {
    this.cards.unshift(...cards); // 배열 맨 앞에 여러 장 추가
  }

  // 카드들을 섞기
  shuffle(): void 
  {
    for (let i = this.cards.length - 1; i > 0; i--) 
    {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  // 맨 위에서 카드 꺼내기 (draw 사용)
  draw(): Card | undefined 
  {
    return this.cards.pop(); // 배열 맨 뒤에서 꺼내기 (덱의 위에서 제거)
  }

  // 맨 아래에서 카드 꺼내기 (drawFromBottom 사용)
  drawFromBottom(): Card | undefined 
  {
    return this.cards.shift(); // 배열 맨 앞에서 꺼내기 (덱의 아래에서 제거)
  }

  // 덱의 카드 수 반환
  getCount(): number 
  {
    return this.cards.length;
  }

  // 덱의 모든 카드 보기 (디버깅용)
  showAllCards(): string 
  {
    return this.cards.map(card => card.toString()).join(', ');
  }

  // 추가된 메서드들

  // 덱이 비었는지 확인
  isEmpty(): boolean 
  {
    return this.cards.length === 0;
  }

  // 덱의 맨 위에 있는 카드 확인 (제거하지 않음)
  peek(): Card | undefined 
  {
    return this.cards[this.cards.length - 1];
  }

  // 덱의 맨 아래에 있는 카드 확인 (제거하지 않음)
  peekBottom(): Card | undefined 
  {
    return this.cards[0];
  }

  // 덱을 초기화하고 새로운 카드 뭉치로 채우기
  resetDeck(newCards: Array<Card>): void 
  {
    this.cards = [...newCards];
    this.shuffle(); // 필요에 따라 섞을 수 있음
  }
}
