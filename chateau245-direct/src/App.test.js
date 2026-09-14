import { fireEvent, render, screen } from '@testing-library/react';
import ViewItem from './pages/UI/view_item';

test('wine facts in the detail view can be turned into filter selections', () => {
  const wine = {
    id: 'wine-1',
    category: 'Wine',
    name: 'Estate Reserve',
    description: 'A smooth red wine.',
    price: 1500,
    image: 'https://example.com/wine.png',
    type: 'Cabernet Sauvignon',
    region: 'Nakuru',
    grape: 'Merlot',
  };

  const onWineFactSelect = jest.fn();

  render(
    <ViewItem
      item={wine}
      addToCart={() => {}}
      onBack={() => {}}
      onCart={() => {}}
      onWineFactSelect={onWineFactSelect}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /Cabernet Sauvignon/i }));
  expect(onWineFactSelect).toHaveBeenCalledWith('type', 'Cabernet Sauvignon');
});
