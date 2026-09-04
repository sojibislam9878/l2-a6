import { validatedQuery } from "../../middlewares/validateRequest.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  IActor,
  IBookingFilters,
  IBookingReasonPayload,
  ICreateBookingPayload,
  IWarehouseBookingFilters,
} from "./booking.interface.js";
import { bookingService } from "./booking.service.js";

const actorOf = (req: { user?: { id: string; role: IActor["role"] } }): IActor => ({
  id: req.user!.id,
  role: req.user!.role,
});

const createBooking = catchAsync(async (req, res) => {
  const data = await bookingService.createBookingDb(
    req.user!.id,
    req.body as ICreateBookingPayload,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Booking created. The warehouse owner must approve it before payment.",
    data,
  });
});

const getMyBookings = catchAsync(async (req, res) => {
  const filters = validatedQuery<IBookingFilters>(res);
  const { data, meta } = await bookingService.getMyBookingsFromDb(req.user!.id, filters);

  sendResponse(res, { statusCode: 200, message: "Bookings retrieved successfully", data, meta });
});

const getAllBookings = catchAsync(async (_req, res) => {
  const filters = validatedQuery<IBookingFilters>(res);
  const { data, meta } = await bookingService.getAllBookingsFromDb(filters);

  sendResponse(res, { statusCode: 200, message: "All bookings retrieved successfully", data, meta });
});

const getBookingById = catchAsync(async (req, res) => {
  const data = await bookingService.getBookingByIdFromDb(String(req.params.id), actorOf(req));

  sendResponse(res, { statusCode: 200, message: "Booking retrieved successfully", data });
});

const getWarehouseBookings = catchAsync(async (req, res) => {
  const filters = validatedQuery<IWarehouseBookingFilters>(res);
  const { data, meta } = await bookingService.getWarehouseBookingsFromDb(
    String(req.params.id),
    req.user!.id,
    filters,
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Warehouse bookings retrieved successfully",
    data,
    meta,
  });
});

const approveBooking = catchAsync(async (req, res) => {
  const data = await bookingService.approveBookingDb(String(req.params.id), actorOf(req), req.ip);

  sendResponse(res, {
    statusCode: 200,
    message: "Booking approved. The farmer must pay before the hold expires.",
    data,
  });
});

const rejectBooking = catchAsync(async (req, res) => {
  const { reason } = req.body as IBookingReasonPayload;
  const data = await bookingService.rejectBookingDb(
    String(req.params.id),
    actorOf(req),
    reason,
    req.ip,
  );

  sendResponse(res, { statusCode: 200, message: "Booking rejected", data });
});

const cancelBooking = catchAsync(async (req, res) => {
  const { reason } = req.body as IBookingReasonPayload;
  const data = await bookingService.cancelBookingDb(
    String(req.params.id),
    actorOf(req),
    reason,
    req.ip,
  );

  sendResponse(res, { statusCode: 200, message: "Booking cancelled", data });
});

const storeBooking = catchAsync(async (req, res) => {
  const data = await bookingService.storeBookingDb(String(req.params.id), actorOf(req), req.ip);

  sendResponse(res, { statusCode: 200, message: "Lot marked as stored", data });
});

const requestWithdrawal = catchAsync(async (req, res) => {
  const data = await bookingService.requestWithdrawalDb(String(req.params.id), actorOf(req), req.ip);

  sendResponse(res, {
    statusCode: 200,
    message: "Withdrawal requested. The warehouse owner will confirm release.",
    data,
  });
});

const completeBooking = catchAsync(async (req, res) => {
  const data = await bookingService.completeBookingDb(String(req.params.id), actorOf(req), req.ip);

  sendResponse(res, {
    statusCode: 200,
    message: `Lot released. Final cost is ${data.finalCost} BDT.`,
    data,
  });
});

const getBookingInvoice = catchAsync(async (req, res) => {
  const data = await bookingService.getBookingInvoiceFromDb(String(req.params.id), actorOf(req));

  sendResponse(res, { statusCode: 200, message: "Invoice retrieved successfully", data });
});

export const bookingController = {
  getBookingInvoice,
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  getWarehouseBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  storeBooking,
  requestWithdrawal,
  completeBooking,
};
