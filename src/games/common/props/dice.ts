export class Dice 
{
  private sides: Map<number, string>;

  constructor(sides: number = 6) 
  {
    this.sides = new Map();

    // 기본적으로 각 면에 숫자 값을 문자열로 할당
    for (let i = 1; i <= sides; i++) 
    {
      this.sides.set(i, i.toString());
    }
  }

  // 주사위를 굴려 무작위 면의 값을 반환
  roll(): string 
  {
    const randomSide = Math.floor(Math.random() * this.sides.size) + 1;
    return this.sides.get(randomSide) || "Invalid side"; // 없는 면일 경우 안전한 처리
  }

  // 현재 주사위의 면 수 반환
  getSideCount(): number 
  {
    return this.sides.size;
  }

  // 특정 면에 값을 설정하는 메서드
  setSideValue(side: number, value: string): void 
  {
    if (side >= 1 && side <= this.sides.size) 
    {
      this.sides.set(side, value);
    }
    else 
    {
      throw new Error("Invalid side number.");
    }
  }

  // 주사위를 여러 번 굴려 결과 배열 반환
  rollMultiple(times: number): Array<string> 
  {
    const results: Array<string> = [];
    for (let i = 0; i < times; i++) 
    {
      results.push(this.roll());
    }
    return results;
  }
}
