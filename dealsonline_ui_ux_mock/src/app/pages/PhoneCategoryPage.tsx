import { Navigate } from 'react-router';

/**
 * /category/:id, the approved phone product-type tree. Its pages carried no
 * products, only further choices, so a shopper who followed it found nothing
 * to compare. Old links land on the department, which has every phone shelf
 * and the comparison categories.
 */
export default function PhoneCategoryPage() {
  return <Navigate to="/aisle/phones-wearables" replace />;
}
