// Chip.ts
export class Chip 
{
  private value: number;

  constructor(value: number) 
  {
    if (value <= 0) 
    {
      throw new Error("Chip value must be greater than zero.");
    }
    this.value = value;
  }

  // 칩의 값을 반환
  getValue(): number 
  {
    return this.value;
  }

  // 칩의 값을 설정
  setValue(value: number): void 
  {
    if (value <= 0) 
    {
      throw new Error("Chip value must be greater than zero.");
    }
    this.value = value;
  }
}

export class ChipStack 
{
  private chips: Array<Chip> = [];

  // 칩 추가
  addChip(chip: Chip): void 
  {
    this.chips.push(chip);
  }

  // 칩 여러 개 추가
  addChips(chips: Array<Chip>): void 
  {
    this.chips.push(...chips);
  }

  // 총 칩의 가치 합산
  getTotalValue(): number 
  {
    return this.chips.reduce((total, chip) => total + chip.getValue(), 0);
  }

  // 칩 제거 (가장 마지막에 추가된 칩 제거)
  removeChip(): Chip | undefined 
  {
    return this.chips.pop();
  }

  // 칩 수 반환
  getCount(): number 
  {
    return this.chips.length;
  }

}
