import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/error.js';

export const getCentres = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [total, centres] = await prisma.$transaction([
    prisma.diagnosticCentre.count(),
    prisma.diagnosticCentre.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        centreTests: {
          include: {
            test: true,
          },
        },
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      centres: centres.map((c) => ({
        id: c.id,
        name: c.name,
        location: c.location,
        createdAt: c.createdAt,
        tests: c.centreTests.map((ct) => ({
          centreTestId: ct.id,
          testId: ct.test.id,
          name: ct.test.name,
          description: ct.test.description,
          price: ct.price,
        })),
      })),
    },
  });
});

export const getCentreById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const centre = await prisma.diagnosticCentre.findUnique({
    where: { id },
    include: {
      centreTests: {
        include: {
          test: true,
        },
      },
    },
  });

  if (!centre) {
    throw new AppError('Diagnostic centre not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      id: centre.id,
      name: centre.name,
      location: centre.location,
      createdAt: centre.createdAt,
      tests: centre.centreTests.map((ct) => ({
        centreTestId: ct.id,
        testId: ct.test.id,
        name: ct.test.name,
        description: ct.test.description,
        price: ct.price,
      })),
    },
  });
});

export const createCentre = asyncHandler(async (req, res) => {
  const { name, location } = req.body;

  const centre = await prisma.diagnosticCentre.create({
    data: { name, location },
  });

  res.status(201).json({
    success: true,
    message: 'Diagnostic centre created successfully',
    data: centre,
  });
});

export const addTestToCentre = asyncHandler(async (req, res) => {
  const { id: centreId } = req.params;
  const { testId, price } = req.body;

  // 1. Verify centre exists
  const centre = await prisma.diagnosticCentre.findUnique({
    where: { id: centreId },
  });
  if (!centre) {
    throw new AppError('Diagnostic centre not found', 404, 'NOT_FOUND');
  }

  // 2. Verify test exists
  const test = await prisma.diagnosticTest.findUnique({
    where: { id: testId },
  });
  if (!test) {
    throw new AppError('Diagnostic test not found', 404, 'NOT_FOUND');
  }

  // 3. Verify price > 0
  if (price <= 0) {
    throw new AppError('Price must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  // 4. Create association (unique constraint will catch duplicates)
  try {
    const centreTest = await prisma.centreTest.create({
      data: {
        centreId,
        testId,
        price,
      },
      include: {
        centre: true,
        test: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Test added to centre successfully',
      data: centreTest,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('This test is already associated with this centre', 409, 'CONFLICT');
    }
    throw error;
  }
});

export const getTests = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [total, tests] = await prisma.$transaction([
    prisma.diagnosticTest.count(),
    prisma.diagnosticTest.findMany({
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      tests,
    },
  });
});

export const createTest = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  try {
    const test = await prisma.diagnosticTest.create({
      data: { name, description },
    });

    res.status(201).json({
      success: true,
      message: 'Diagnostic test created successfully',
      data: test,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('A test with this name already exists', 409, 'CONFLICT');
    }
    throw error;
  }
});
