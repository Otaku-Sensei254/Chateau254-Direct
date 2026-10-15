import { FiArrowRight, FiCheck, FiMessageCircle } from 'react-icons/fi';

const Confirmation = ({ order, onTrack, onMenu }) => (
	<main className="content-page confirmation-page">
		<div className="success-icon"><FiCheck /></div>
		<p className="eyebrow">Order saved</p>
		<h1>Thank you, {order?.customer?.name || 'Customer'}!</h1>
		<p>Your order has been saved for the Château team. No online payment has been taken.</p>
		<div className="order-ticket">
			<span>Order #{order?.number}</span>
			<strong>KES {Number(order?.total || 0).toLocaleString()}</strong>
			{order?.items?.length > 0 && (
				<ul className="confirmation-order-items">
					{order.items.map((item, index) => (
						<li key={`${item.name}-${index}`}>
							<span>{item.quantity} × {item.name}</span>
							<strong>KES {item.lineTotal.toLocaleString()}</strong>
						</li>
					))}
				</ul>
			)}
			<small>Message us to confirm your order and arrange payment.</small>
		</div>
		<button className="text-button" onClick={onTrack}>View order status <FiArrowRight /></button>
		<button className="text-button" onClick={onMenu}>Continue browsing <FiArrowRight /></button>
		{order?.whatsappUrl && (
			<a className="primary-button full confirmation-whatsapp-button" href={order.whatsappUrl} target="_blank" rel="noopener noreferrer">
				<FiMessageCircle /> Message Château
			</a>
		)}
	</main>
);

export default Confirmation;
